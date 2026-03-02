import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { CliError } from '../core/errors';
import {
  appClassTemplate,
  appPackageJsonTemplate,
  appReadmeTemplate,
  appTsConfigTemplate,
} from '../core/templates';
import { Command, CommandContext } from '../core/types';
import { writeJsonFile } from '../utils/files';
import { prompt } from '../utils/prompt';
import { slugify, toPascalCase } from '../utils/strings';

const execFileAsync = promisify(execFile);

const ICON_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9+U4cAAAAASUVORK5CYII=';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new Rocket.Chat app project.',
  usage: 'rc-apps create [name] [--description <text>] [--author <name>] [--support <urlOrEmail>] [--homepage <url>] [--skip-install]',
  async run(argv: string[], context: CommandContext): Promise<void> {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        name: { type: 'string', short: 'n' },
        description: { type: 'string', short: 'd' },
        author: { type: 'string', short: 'a' },
        support: { type: 'string', short: 's' },
        homepage: { type: 'string', short: 'H' },
        'skip-install': { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
      },
    });

    const appName =
      parsed.values.name ??
      parsed.positionals[0] ??
      (await prompt('App name'));

    if (!appName.trim()) {
      throw new CliError('App name is required.', 2);
    }

    const description = parsed.values.description ?? (await prompt('Description', 'Rocket.Chat App'));
    const author = parsed.values.author ?? (await prompt('Author name', 'Your Name'));
    const support = parsed.values.support ?? (await prompt('Support URL or email', 'support@example.com'));
    const homepage = parsed.values.homepage ?? (await prompt('Homepage URL', 'https://example.com'));

    const nameSlug = slugify(appName);
    const classBaseName = toPascalCase(appName);
    const className = classBaseName.endsWith('App') ? classBaseName : `${classBaseName}App`;
    const folderPath = path.resolve(context.cwd, nameSlug);

    if (existsSync(folderPath) && !parsed.values.force) {
      throw new CliError(`Directory already exists: ${folderPath}. Use --force to overwrite.`, 2);
    }

    await mkdir(folderPath, { recursive: true });
    await mkdir(path.join(folderPath, 'src'), { recursive: true });

    const requiredApiVersion = await detectAppsEngineVersion(context.cwd);

    const manifest = {
      id: randomUUID(),
      name: appName,
      nameSlug,
      version: '0.0.1',
      requiredApiVersion,
      description,
      author: {
        name: author,
        support,
        homepage,
      },
      classFile: `src/${className}.ts`,
      iconFile: 'icon.png',
    };

    await writeJsonFile(path.join(folderPath, 'app.json'), manifest);
    await writeFile(path.join(folderPath, 'README.md'), appReadmeTemplate(manifest), 'utf8');
    await writeFile(path.join(folderPath, 'src', `${className}.ts`), appClassTemplate(className), 'utf8');
    await writeFile(path.join(folderPath, 'tsconfig.json'), appTsConfigTemplate(), 'utf8');
    await writeFile(path.join(folderPath, '.gitignore'), 'dist\nnode_modules\n', 'utf8');
    await writeFile(
      path.join(folderPath, '.rcappsconfig'),
      `${JSON.stringify({ ignoredFiles: ['**/dist/**', '**/node_modules/**', '**/.git/**'] }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(path.join(folderPath, 'package.json'), appPackageJsonTemplate(nameSlug, requiredApiVersion), 'utf8');
    await writeFile(path.join(folderPath, 'icon.png'), Buffer.from(ICON_1PX_BASE64, 'base64'));

    if (!parsed.values['skip-install']) {
      console.log('Installing dependencies...');
      await runNpmInstall(folderPath);
    }

    console.log(`App created: ${folderPath}`);
  },
};

async function runNpmInstall(directory: string): Promise<void> {
  try {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await execFileAsync(npmCommand, ['install'], { cwd: directory });
  } catch {
    throw new CliError('Failed to run npm install for the generated app. Re-run npm install manually.', 1);
  }
}

async function detectAppsEngineVersion(cwd: string): Promise<string> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
    const pkg = JSON.parse(packageJsonRaw) as { dependencies?: Record<string, string> };

    return pkg.dependencies?.['@rocket.chat/apps-engine'] ?? '^1.59.0';
  } catch {
    return '^1.59.0';
  }
}
