import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { getServerInfo, uploadApp } from '../core/deploy';
import { loadConfigFile, loadProject, mergeDeployConfig } from '../core/project';
import { Command, CommandContext, DeployConfig } from '../core/types';

export const deployCommand: Command = {
  name: 'deploy',
  description: 'Compile, package, and deploy an app to Rocket.Chat.',
  usage: 'rc-apps deploy [--project <path>] --url <server> [--username <u> --password <p> | --userId <id> --token <t>]',
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

    console.log('Checking server...');
    const serverInfo = await getServerInfo(deployConfig);

    if (serverInfo.version) {
      console.log(`Server version: ${serverInfo.version}`);
    }

    console.log('Packaging app...');
    const zipRelativePath = await buildAndPackage(project, {
      force: parsed.values.force,
      verbose: parsed.values.verbose,
      useNativeCompiler: parsed.values['experimental-native-compiler'],
    });

    const zipAbsolutePath = path.resolve(project.rootPath, zipRelativePath);

    console.log('Uploading app...');
    const result = await uploadApp(deployConfig, project, zipAbsolutePath);
    console.log(`Deployment finished (${result.mode}).`);
  },
};
