import { FSWatcher, watch } from 'fs';
import { readdir } from 'fs/promises';
import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { getServerInfo, loadIgnoredPatterns, uploadApp, validateDeployCredentials } from '../core/deploy';
import { loadDeployConfigFromEnv } from '../core/env';
import { CliError } from '../core/errors';
import { loadConfigFile, loadProject, mergeDeployConfig } from '../core/project';
import { Command, CommandContext, DeployConfig } from '../core/types';
import { buildGlobMatcher } from '../utils/glob';
import { failure, step, success, verbose, warn } from '../utils/output';

export const watchCommand: Command = {
  name: 'watch',
  description: 'Watch app files and deploy on changes.',
  usage: 'rc-apps watch [--project <path>] --url <server> [--allow-http] [--legacy-compiler] [auth options]',
  async run(argv: string[], context: CommandContext): Promise<void> {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: false,
      options: {
        project: { type: 'string' },
        url: { type: 'string' },
        username: { type: 'string', short: 'u' },
        password: { type: 'string', short: 'p' },
        token: { type: 'string', short: 't' },
        userId: { type: 'string', short: 'i' },
        code: { type: 'string', short: 'c' },
        'allow-http': { type: 'boolean' },
        'legacy-compiler': { type: 'boolean', default: false },
        update: { type: 'boolean' },
        force: { type: 'boolean', short: 'f', default: false },
        verbose: { type: 'boolean', short: 'v', default: false },
        debounce: { type: 'string' },
        'experimental-native-compiler': { type: 'boolean', default: false },
      },
    });

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);
    const configLoadResult = await loadConfigFile(project.rootPath);
    const configFromFile = configLoadResult.config;
    const configFromEnv = loadDeployConfigFromEnv();
    const allowHttpProvided = hasBooleanOption(argv, 'allow-http');
    const updateProvided = hasBooleanOption(argv, 'update');

    const cliConfig: DeployConfig = {
      url: parsed.values.url,
      username: parsed.values.username,
      password: parsed.values.password,
      token: parsed.values.token,
      userId: parsed.values.userId,
      code: parsed.values.code,
      allowHttp: allowHttpProvided ? parsed.values['allow-http'] : undefined,
      update: updateProvided ? parsed.values.update : undefined,
    };

    const deployConfig = mergeDeployConfig(mergeDeployConfig(configFromFile, configFromEnv), cliConfig);
    const verboseMode = parsed.values.verbose;
    const useLegacyCompiler = parsed.values['legacy-compiler'];

    if (parsed.values['experimental-native-compiler']) {
      warn('`--experimental-native-compiler` is deprecated in v2 and now a no-op (native is default).');
    }

    if (configLoadResult.legacyFields.length > 0) {
      warn(
        `Ignoring legacy .rcappsconfig field(s): ${configLoadResult.legacyFields.join(
          ', ',
        )}. Use CLI flags or RC_APPS_* environment variables.`,
      );
    }

    validateDeployCredentials(deployConfig);

    verbose(verboseMode, `Project: ${project.rootPath}`);
    verbose(verboseMode, `URL security: ${deployConfig.allowHttp ? 'allow-http override enabled' : 'https enforced'}`);
    verbose(verboseMode, `Compiler mode: ${useLegacyCompiler ? 'legacy' : 'native-default'}`);
    verbose(
      verboseMode,
      deployConfig.token && deployConfig.userId ? 'Auth mode: token/userId' : 'Auth mode: username/password',
    );

    step('Checking server...');
    await getServerInfo(deployConfig);

    const ignoredPatterns = await loadIgnoredPatterns(deployConfig);
    const isIgnored = buildGlobMatcher(ignoredPatterns);
    const debounceMs = Number(parsed.values.debounce ?? '800');
    verbose(verboseMode, `Watch debounce: ${debounceMs}ms`);
    verbose(verboseMode, `Ignored patterns: ${ignoredPatterns.length}`);

    if (Number.isNaN(debounceMs) || debounceMs < 0) {
      throw new CliError('Invalid --debounce value.', 2);
    }

    let running = false;
    let queued = false;

    const runDeployment = async (): Promise<void> => {
      if (running) {
        queued = true;
        return;
      }

      running = true;

      try {
        const zipRelativePath = await buildAndPackage(project, {
          force: parsed.values.force,
          verbose: verboseMode,
          useNativeCompiler: !useLegacyCompiler,
        });

        const zipAbsolutePath = path.resolve(project.rootPath, zipRelativePath);
        verbose(verboseMode, `Package path: ${zipAbsolutePath}`);
        const result = await uploadApp(deployConfig, project, zipAbsolutePath);
        success(`Deployment finished (${result.mode}).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failure(`Watch deployment failed: ${message}`);
      } finally {
        running = false;

        if (queued) {
          queued = false;
          await runDeployment();
        }
      }
    };

    await runDeployment();

    let timer: NodeJS.Timeout | undefined;
    const watchers = new Map<string, FSWatcher>();
    let watcherErrorHandler: ((error: Error) => void) | undefined;
    const recursiveWatchSupported = supportsRecursiveWatch();

    const removeWatcher = (watchPath: string): void => {
      const watcher = watchers.get(watchPath);

      if (watcher) {
        if (watcherErrorHandler) {
          watcher.off('error', watcherErrorHandler);
        }

        watcher.close();
        watchers.delete(watchPath);
      }
    };

    const addWatcher = (watchPath: string, recursive: boolean): void => {
      const watcher = watch(watchPath, { recursive, encoding: 'utf8' }, (eventType, fileName) => {
        if (!fileName) {
          return;
        }

        if (!recursiveWatchSupported && eventType === 'rename') {
          void syncWatchers();
        }
        const absolutePath = path.resolve(watchPath, fileName);
        const relativePath = toRelativeRootPath(project.rootPath, absolutePath);

        if (!relativePath || isIgnored(relativePath)) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(() => {
          void runDeployment();
        }, debounceMs);
      });

      if (watcherErrorHandler) {
        watcher.on('error', watcherErrorHandler);
      }

      watchers.set(watchPath, watcher);
    };

    const syncWatchers = async (): Promise<void> => {
      const discoveredDirectories = await collectDirectories(project.rootPath);

      for (const directoryPath of discoveredDirectories) {
        if (!watchers.has(directoryPath)) {
          addWatcher(directoryPath, false);
        }
      }
    };

    if (recursiveWatchSupported) {
      addWatcher(project.rootPath, true);
    } else {
      warn(
        'Recursive fs.watch is not supported on this platform. Falling back to multi-directory watch mode.',
      );
      await syncWatchers();
    }

    step('Watching for changes. Press Ctrl+C to stop.');

    await new Promise<void>((resolve, reject) => {
      let sigintHandler: (() => void) | undefined;

      const cleanup = (): void => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }

        if (sigintHandler) {
          process.off('SIGINT', sigintHandler);
          sigintHandler = undefined;
        }

        for (const watcherPath of Array.from(watchers.keys())) {
          removeWatcher(watcherPath);
        }

        watcherErrorHandler = undefined;
      };

      watcherErrorHandler = (error: Error) => {
        cleanup();
        reject(error);
      };

      for (const watcher of watchers.values()) {
        watcher.on('error', watcherErrorHandler);
      }

      sigintHandler = () => {
        cleanup();
        resolve();
      };

      process.once('SIGINT', sigintHandler);
    });
  },
};

function hasBooleanOption(args: string[], option: string): boolean {
  const optionPrefix = `--${option}`;
  return args.some((arg) => arg === optionPrefix || arg.startsWith(`${optionPrefix}=`));
}

function supportsRecursiveWatch(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32';
}

function toRelativeRootPath(rootPath: string, absolutePath: string): string | undefined {
  const relativePath = path.relative(rootPath, absolutePath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return relativePath.replace(/\\/g, '/');
}

async function collectDirectories(rootPath: string): Promise<string[]> {
  const directories: string[] = [rootPath];
  const queue: string[] = [rootPath];

  while (queue.length > 0) {
    const directoryPath = queue.pop() as string;
    const entries = await readdir(directoryPath, { withFileTypes: true, encoding: 'utf8' }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const nestedDirectoryPath = path.join(directoryPath, entry.name);
      directories.push(nestedDirectoryPath);
      queue.push(nestedDirectoryPath);
    }
  }

  return directories;
}
