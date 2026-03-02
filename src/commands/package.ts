import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { CliError } from '../core/errors';
import { loadProject } from '../core/project';
import { packageSource } from '../core/source-packager';
import { Command, CommandContext } from '../core/types';

export const packageCommand: Command = {
  name: 'package',
  aliases: ['p', 'pack'],
  description: 'Package an app into a deployable zip file.',
  usage:
    'rc-apps package [--project <path>] [--force] [--verbose] [--no-compile] [--experimental-native-compiler]',
  async run(argv: string[], context: CommandContext): Promise<void> {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: false,
      options: {
        project: { type: 'string' },
        force: { type: 'boolean', short: 'f', default: false },
        verbose: { type: 'boolean', short: 'v', default: false },
        'no-compile': { type: 'boolean', default: false },
        'experimental-native-compiler': { type: 'boolean', default: false },
      },
    });

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);

    console.log('Packaging app...');

    const zipRelativePath = parsed.values['no-compile']
      ? await packageSource(project)
      : await buildAndPackage(project, {
          force: parsed.values.force,
          verbose: parsed.values.verbose,
          useNativeCompiler: parsed.values['experimental-native-compiler'],
        });

    const zipAbsolutePath = path.resolve(project.rootPath, zipRelativePath);

    if (!zipAbsolutePath.startsWith(project.rootPath)) {
      throw new CliError('Unexpected zip output path.', 1);
    }

    console.log(`Package created: ${zipAbsolutePath}`);
  },
};
