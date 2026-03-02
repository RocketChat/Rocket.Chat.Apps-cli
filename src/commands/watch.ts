import { watch } from 'fs';
import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { getServerInfo, loadIgnoredPatterns, uploadApp, validateDeployCredentials } from '../core/deploy';
import { CliError } from '../core/errors';
import { loadConfigFile, loadProject, mergeDeployConfig } from '../core/project';
import { Command, CommandContext, DeployConfig } from '../core/types';
import { buildGlobMatcher } from '../utils/glob';
import { failure, step, success, verbose } from '../utils/output';

export const watchCommand: Command = {
  name: 'watch',
  description: 'Watch app files and deploy on changes.',
  usage: 'rc-apps watch [--project <path>] --url <server> [auth options]',
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
        update: { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
        verbose: { type: 'boolean', short: 'v', default: false },
        debounce: { type: 'string' },
        'experimental-native-compiler': { type: 'boolean', default: false },
      },
    });

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);
    const configFromFile = await loadConfigFile(project.rootPath);

    const cliConfig: DeployConfig = {
      url: parsed.values.url,
      username: parsed.values.username,
      password: parsed.values.password,
      token: parsed.values.token,
      userId: parsed.values.userId,
      code: parsed.values.code,
      update: parsed.values.update,
    };

    const deployConfig = mergeDeployConfig(configFromFile, cliConfig);
    const verboseMode = parsed.values.verbose;
    validateDeployCredentials(deployConfig);

    verbose(verboseMode, `Project: ${project.rootPath}`);
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
          useNativeCompiler: parsed.values['experimental-native-compiler'],
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

    const watcher = watch(project.rootPath, { recursive: true, encoding: 'utf8' }, (_eventType, fileName) => {
      if (!fileName) {
        return;
      }

      const relativePath = fileName.replace(/\\/g, '/');

      if (isIgnored(relativePath)) {
        return;
      }

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        void runDeployment();
      }, debounceMs);
    });

    step('Watching for changes. Press Ctrl+C to stop.');

    await new Promise<void>((resolve, reject) => {
      watcher.on('error', reject);
      process.on('SIGINT', () => {
        watcher.close();
        resolve();
      });
    });
  },
};
