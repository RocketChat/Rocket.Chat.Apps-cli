import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { getServerInfo, uploadApp, validateDeployCredentials } from '../core/deploy';
import { loadDeployConfigFromEnv } from '../core/env';
import { loadConfigFile, loadProject, mergeDeployConfig } from '../core/project';
import { Command, CommandContext, DeployConfig } from '../core/types';
import { step, success, verbose, warn } from '../utils/output';

export const deployCommand: Command = {
  name: 'deploy',
  description: 'Compile, package, and deploy an app to Rocket.Chat.',
  usage:
    'rc-apps deploy [--project <path>] --url <server> [--allow-http] [--legacy-compiler] [--username <u> --password <p> | --userId <id> --token <t>]',
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
        'allow-http': { type: 'boolean', default: false },
        'legacy-compiler': { type: 'boolean', default: false },
        update: { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
        verbose: { type: 'boolean', short: 'v', default: false },
        'experimental-native-compiler': { type: 'boolean', default: false },
      },
    });

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);
    const configLoadResult = await loadConfigFile(project.rootPath);
    const configFromFile = configLoadResult.config;
    const configFromEnv = loadDeployConfigFromEnv();

    const cliConfig: DeployConfig = {
      url: parsed.values.url,
      username: parsed.values.username,
      password: parsed.values.password,
      token: parsed.values.token,
      userId: parsed.values.userId,
      code: parsed.values.code,
      allowHttp: parsed.values['allow-http'],
      update: parsed.values.update,
    };

    const deployConfig = mergeDeployConfig(mergeDeployConfig(configFromFile, configFromEnv), cliConfig);
    const verboseMode = parsed.values.verbose;
    const useLegacyCompiler = parsed.values['legacy-compiler'];
    const compilerMode = useLegacyCompiler ? 'legacy' : 'native-default';

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
    verbose(verboseMode, `Compiler mode: ${compilerMode}`);
    verbose(verboseMode, `URL security: ${deployConfig.allowHttp ? 'allow-http override enabled' : 'https enforced'}`);
    verbose(
      verboseMode,
      deployConfig.token && deployConfig.userId ? 'Auth mode: token/userId' : 'Auth mode: username/password',
    );

    step('Checking server...');
    const serverInfo = await getServerInfo(deployConfig);

    if (serverInfo.version) {
      success(`Server version: ${serverInfo.version}`);
    }

    step('Packaging app...');
    const zipRelativePath = await buildAndPackage(project, {
      force: parsed.values.force,
      verbose: verboseMode,
      useNativeCompiler: !useLegacyCompiler,
    });

    const zipAbsolutePath = path.resolve(project.rootPath, zipRelativePath);
    verbose(verboseMode, `Package path: ${zipAbsolutePath}`);

    step('Uploading app...');
    const result = await uploadApp(deployConfig, project, zipAbsolutePath);
    success(`Deployment finished (${result.mode}).`);
  },
};
