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
import { loadProject, ProjectContext } from '../core/project';
import { Command, CommandContext } from '../core/types';
import { ensureDirectory } from '../utils/files';
import { prompt } from '../utils/prompt';
import { toPascalCase } from '../utils/strings';

const ACCESSOR_IMPORT = `import { IConfigurationExtend, IEnvironmentRead } from '@rocket.chat/apps-engine/definition/accessors';`;
const API_IMPORT = `import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';`;
const API_ENDPOINTS_MARKER = '// rc-apps:api-endpoints';
const SLASH_COMMANDS_MARKER = '// rc-apps:slash-commands';
const SETTINGS_MARKER = '// rc-apps:settings';
const MISSING_MARKERS_ERROR =
  'Unable to auto-register generated files because rc-apps markers were not found in the app class.';

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
      const endpointFilePath = path.join(directory, `${className}.ts`);
      await writeFile(endpointFilePath, endpointTemplate(className, endpointPath), 'utf8');
      await attemptAutoRegistration('endpoint', async () => {
        await updateAppClassWithEndpoint(project, className, endpointFilePath);
      });
      console.log(`Generated endpoint: ${endpointFilePath}`);
      return;
    }

    if (target === 'slash-command') {
      const rawName = parsed.positionals[1] ?? (await prompt('Slash command class name'));
      const className = toPascalCase(rawName);
      const directory = path.join(project.rootPath, 'slashCommands');
      await ensureDirectory(directory);
      const slashCommandFilePath = path.join(directory, `${className}.ts`);
      await writeFile(slashCommandFilePath, slashCommandTemplate(className), 'utf8');
      await attemptAutoRegistration('slash command', async () => {
        await updateAppClassWithSlashCommand(project, className, slashCommandFilePath);
      });
      console.log(`Generated slash command: ${slashCommandFilePath}`);
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
      await attemptAutoRegistration('settings', async () => {
        await updateAppClassWithSettings(project, settingsPath);
      });
      console.log(`Updated settings: ${settingsPath}`);
      return;
    }

    throw new CliError(`Unknown generate target: ${target}`, 2);
  },
};

async function updateAppClassWithEndpoint(
  project: ProjectContext,
  className: string,
  endpointFilePath: string,
): Promise<void> {
  const appClassPath = path.resolve(project.rootPath, project.manifest.classFile);
  const moduleImportPath = toModuleImportPath(path.relative(path.dirname(appClassPath), endpointFilePath));

  await updateAppClass(project, [
    ACCESSOR_IMPORT,
    API_IMPORT,
    `import { ${className} } from '${moduleImportPath}';`,
  ], [
    { marker: API_ENDPOINTS_MARKER, entry: `new ${className}(),` },
  ]);
}

async function updateAppClassWithSlashCommand(
  project: ProjectContext,
  className: string,
  slashCommandFilePath: string,
): Promise<void> {
  const appClassPath = path.resolve(project.rootPath, project.manifest.classFile);
  const moduleImportPath = toModuleImportPath(path.relative(path.dirname(appClassPath), slashCommandFilePath));

  await updateAppClass(project, [
    ACCESSOR_IMPORT,
    API_IMPORT,
    `import { ${className} } from '${moduleImportPath}';`,
  ], [
    { marker: SLASH_COMMANDS_MARKER, entry: `new ${className}(),` },
  ]);
}

async function updateAppClassWithSettings(project: ProjectContext, settingsPath: string): Promise<void> {
  const appClassPath = path.resolve(project.rootPath, project.manifest.classFile);
  const moduleImportPath = toModuleImportPath(path.relative(path.dirname(appClassPath), settingsPath));

  await updateAppClass(project, [
    ACCESSOR_IMPORT,
    API_IMPORT,
    `import { settings } from '${moduleImportPath}';`,
  ], [
    { marker: SETTINGS_MARKER, entry: '...settings,' },
  ]);
}

interface MarkerEntry {
  marker: string;
  entry: string;
}

async function attemptAutoRegistration(target: string, register: () => Promise<void>): Promise<void> {
  try {
    await register();
  } catch (error) {
    if (error instanceof CliError && error.message === MISSING_MARKERS_ERROR) {
      console.warn(
        [
          `Auto-registration skipped for generated ${target}.`,
          'The app class does not contain rc-apps markers.',
          `Add ${API_ENDPOINTS_MARKER}, ${SLASH_COMMANDS_MARKER}, and ${SETTINGS_MARKER} in your extendConfiguration method to enable automatic wiring.`,
        ].join('\n'),
      );
      return;
    }

    throw error;
  }
}

async function updateAppClass(project: ProjectContext, imports: string[], markerEntries: MarkerEntry[]): Promise<void> {
  const appClassPath = path.resolve(project.rootPath, project.manifest.classFile);
  let source = await readFile(appClassPath, 'utf8');

  for (const importLine of imports) {
    source = addImportIfMissing(source, importLine);
  }

  ensureRegistrationMarkers(source);

  for (const markerEntry of markerEntries) {
    source = addMarkerEntry(source, markerEntry.marker, markerEntry.entry);
  }

  await writeFile(appClassPath, source, 'utf8');
}

function ensureRegistrationMarkers(source: string): void {
  if (source.includes(API_ENDPOINTS_MARKER) && source.includes(SLASH_COMMANDS_MARKER) && source.includes(SETTINGS_MARKER)) {
    return;
  }

  throw new CliError(MISSING_MARKERS_ERROR, 2);
}

function addImportIfMissing(source: string, importLine: string): string {
  if (importLine === ACCESSOR_IMPORT) {
    if (
      source.includes("from '@rocket.chat/apps-engine/definition/accessors';") &&
      source.includes('IConfigurationExtend') &&
      source.includes('IEnvironmentRead')
    ) {
      return source;
    }
  } else if (importLine === API_IMPORT) {
    if (
      source.includes("from '@rocket.chat/apps-engine/definition/api';") &&
      source.includes('ApiSecurity') &&
      source.includes('ApiVisibility')
    ) {
      return source;
    }
  } else if (source.includes(importLine)) {
    return source;
  }

  const classIndex = source.indexOf('export class ');

  if (classIndex === -1) {
    throw new CliError('Unable to locate app class declaration for generated registration.', 2);
  }

  return `${source.slice(0, classIndex)}${importLine}\n${source.slice(classIndex)}`;
}

function addMarkerEntry(source: string, marker: string, entry: string): string {
  const entryLine = `      ${entry}`;

  if (source.includes(entryLine)) {
    return source;
  }

  const markerLine = `      ${marker}`;

  if (!source.includes(markerLine)) {
    throw new CliError(`Unable to locate generated marker ${marker} in app class.`, 2);
  }

  return source.replace(markerLine, `${entryLine}\n${markerLine}`);
}

function toModuleImportPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}
