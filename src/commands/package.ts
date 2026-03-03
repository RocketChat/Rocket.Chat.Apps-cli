import { parseArgs } from 'util';
import path from 'path';

import { buildAndPackage } from '../core/compiler';
import { CliError } from '../core/errors';
import { loadProject } from '../core/project';
import { packageSource } from '../core/source-packager';
import { Command, CommandContext } from '../core/types';
import { step, success, verbose, warn } from '../utils/output';

export const packageCommand: Command = {
  name: 'package',
  aliases: ['p', 'pack'],
  description: 'Package an app into a deployable zip file.',
  usage:
    'rc-apps package [--project <path>] [--force] [--verbose] [--no-compile] [--legacy-compiler]',
  async run(argv: string[], context: CommandContext): Promise<void> {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: false,
      options: {
        project: { type: 'string' },
        force: { type: 'boolean', short: 'f', default: false },
        verbose: { type: 'boolean', short: 'v', default: false },
        'no-compile': { type: 'boolean', default: false },
        'legacy-compiler': { type: 'boolean', default: false },
        'experimental-native-compiler': { type: 'boolean', default: false },
      },
    });

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);
    const verboseMode = parsed.values.verbose;
    const useLegacyCompiler = parsed.values['legacy-compiler'];
    const useDeprecatedNativeFlag = parsed.values['experimental-native-compiler'];

    if (useDeprecatedNativeFlag) {
      warn('`--experimental-native-compiler` is deprecated in v2 and now a no-op (native is default).');
    }

    if (parsed.values['no-compile'] && useLegacyCompiler) {
      warn('Ignoring --legacy-compiler because --no-compile was provided.');
    }

    step('Packaging app...');
    verbose(verboseMode, `Project: ${project.rootPath}`);
    verbose(
      verboseMode,
      parsed.values['no-compile'] ? 'Packaging mode: source zip (--no-compile)' : 'Packaging mode: compiled bundle',
    );
    if (!parsed.values['no-compile']) {
      verbose(verboseMode, `Compiler mode: ${useLegacyCompiler ? 'legacy' : 'native-default'}`);
    }

    const zipRelativePath = parsed.values['no-compile']
      ? await packageSource(project)
      : await buildAndPackage(project, {
          force: parsed.values.force,
          verbose: verboseMode,
          useNativeCompiler: !useLegacyCompiler,
        });

    const zipAbsolutePath = path.resolve(project.rootPath, zipRelativePath);

    if (!zipAbsolutePath.startsWith(project.rootPath)) {
      throw new CliError('Unexpected zip output path.', 1);
    }

    success(`Package created: ${zipAbsolutePath}`);
  },
};
