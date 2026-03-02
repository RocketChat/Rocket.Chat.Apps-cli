import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';

import { CliError } from '../core/errors';
import {
  appendSettingTemplate,
  endpointTemplate,
  initialSettingsTemplate,
  slashCommandTemplate,
} from '../core/templates';
import { loadProject } from '../core/project';
import { Command, CommandContext } from '../core/types';
import { ensureDirectory } from '../utils/files';
import { prompt } from '../utils/prompt';
import { toPascalCase } from '../utils/strings';

export const generateCommand: Command = {
  name: 'generate',
  aliases: ['g'],
  description: 'Generate boilerplate for app extensions.',
  usage: 'rc-apps generate <endpoint|slash-command|setting> [name] [--path <route>] [--project <path>]',
  async run(argv: string[], context: CommandContext): Promise<void> {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        path: { type: 'string' },
        project: { type: 'string' },
      },
    });

    const target = parsed.positionals[0];

    if (!target) {
      throw new CliError('Select what to generate: endpoint, slash-command, or setting.', 2);
    }

    const projectPath = parsed.values.project ? path.resolve(parsed.values.project) : context.cwd;
    const project = await loadProject(projectPath);

    if (target === 'endpoint') {
      const rawName = parsed.positionals[1] ?? (await prompt('Endpoint class name'));
      const endpointPath = parsed.values.path ?? (await prompt('Endpoint path', '/example'));
      const className = toPascalCase(rawName);

      const directory = path.join(project.rootPath, 'endpoints');
      await ensureDirectory(directory);
      await writeFile(path.join(directory, `${className}.ts`), endpointTemplate(className, endpointPath), 'utf8');
      console.log(`Generated endpoint: ${path.join(directory, `${className}.ts`)}`);
      return;
    }

    if (target === 'slash-command') {
      const rawName = parsed.positionals[1] ?? (await prompt('Slash command class name'));
      const className = toPascalCase(rawName);
      const directory = path.join(project.rootPath, 'slashCommands');
      await ensureDirectory(directory);
      await writeFile(path.join(directory, `${className}.ts`), slashCommandTemplate(className), 'utf8');
      console.log(`Generated slash command: ${path.join(directory, `${className}.ts`)}`);
      return;
    }

    if (target === 'setting') {
      const settingId = parsed.positionals[1] ?? (await prompt('Setting id', 'my_setting'));
      const settingsPath = path.join(project.rootPath, 'settings.ts');

      let existing = '';
      try {
        existing = await readFile(settingsPath, 'utf8');
      } catch {
        existing = initialSettingsTemplate();
      }

      const updated = appendSettingTemplate(existing, settingId);
      await writeFile(settingsPath, updated, 'utf8');
      console.log(`Updated settings: ${settingsPath}`);
      return;
    }

    throw new CliError(`Unknown generate target: ${target}`, 2);
  },
};
