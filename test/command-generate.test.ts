const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, readFile, writeFile } = require('node:fs/promises');

const promptModule = require('../lib/utils/prompt.js');
const { generateCommand } = require('../lib/commands/generate.js');
const { CliError } = require('../lib/core/errors.js');
const { captureConsole, createTempDir, patch, removeTempDir } = require('./helpers.ts');

const DEFAULT_APP_CLASS_SOURCE = `import {
  IAppAccessors,
  IConfigurationExtend,
  IEnvironmentRead,
  ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility, IApiEndpoint } from '@rocket.chat/apps-engine/definition/api';
import { App as RcApp } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { ISlashCommand } from '@rocket.chat/apps-engine/definition/slashcommands';

export class App extends RcApp {
  constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
    super(info, logger, accessors);
  }

  protected async extendConfiguration(
    configuration: IConfigurationExtend,
    _environmentRead: IEnvironmentRead,
  ): Promise<void> {
    const endpoints: IApiEndpoint[] = [
      // rc-apps:api-endpoints
    ];

    if (endpoints.length > 0) {
      await configuration.api.provideApi({
        visibility: ApiVisibility.PUBLIC,
        security: ApiSecurity.UNSECURE,
        endpoints,
      });
    }

    const slashCommands: ISlashCommand[] = [
      // rc-apps:slash-commands
    ];

    for (const slashCommand of slashCommands) {
      await configuration.slashCommands.provideSlashCommand(slashCommand);
    }

    const appSettings: ISetting[] = [
      // rc-apps:settings
    ];

    for (const setting of appSettings) {
      await configuration.settings.provideSetting(setting);
    }
  }
}`;

async function createProject(root: string, appClassSource = DEFAULT_APP_CLASS_SOURCE): Promise<void> {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(
    path.join(root, 'app.json'),
    JSON.stringify(
      {
        id: 'id',
        name: 'name',
        nameSlug: 'name',
        version: '1.0.0',
        requiredApiVersion: '^1.0.0',
        description: 'desc',
        author: { name: 'n', support: 's' },
        classFile: 'src/App.ts',
        iconFile: 'icon.png',
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(path.join(root, 'src', 'App.ts'), appClassSource, 'utf8');
  await writeFile(path.join(root, 'icon.png'), '', 'utf8');
}

test('generate command creates endpoint and slash-command files', async () => {
  const root = await createTempDir();

  try {
    await createProject(root);
    await generateCommand.run(['endpoint', 'my endpoint', '--path', '/api-x'], { cwd: root });
    await generateCommand.run(['slash-command', 'my slash'], { cwd: root });

    const endpoint = await readFile(path.join(root, 'endpoints', 'MyEndpoint.ts'), 'utf8');
    const slash = await readFile(path.join(root, 'slashCommands', 'MySlash.ts'), 'utf8');
    const appClass = await readFile(path.join(root, 'src', 'App.ts'), 'utf8');
    assert.equal(endpoint.includes("public path = '/api-x';"), true);
    assert.equal(slash.includes("public command = 'myslash';"), true);
    assert.equal(endpoint.includes("from '@rocket.chat/apps-engine/definition/api';"), true);
    assert.equal(appClass.includes("import { MyEndpoint } from '../endpoints/MyEndpoint';"), true);
    assert.equal(appClass.includes("import { MySlash } from '../slashCommands/MySlash';"), true);
    assert.equal(appClass.includes('await configuration.api.provideApi({'), true);
    assert.equal(appClass.includes('new MyEndpoint(),'), true);
    assert.equal(appClass.includes('new MySlash(),'), true);
  } finally {
    await removeTempDir(root);
  }
});

test('generate command creates and appends settings', async () => {
  const root = await createTempDir();

  try {
    await createProject(root);
    await generateCommand.run(['setting', 'first_setting'], { cwd: root });
    await generateCommand.run(['setting', 'second_setting'], { cwd: root });

    const settings = await readFile(path.join(root, 'settings.ts'), 'utf8');
    const appClass = await readFile(path.join(root, 'src', 'App.ts'), 'utf8');
    assert.equal(settings.includes("id: 'first_setting'"), true);
    assert.equal(settings.includes("id: 'second_setting'"), true);
    assert.equal(appClass.includes("import { settings } from '../settings';"), true);
    assert.equal(appClass.includes('...settings,'), true);
  } finally {
    await removeTempDir(root);
  }
});

test('generate command uses prompts when values are missing', async () => {
  const root = await createTempDir();
  const answers = ['Prompt Endpoint', '/prompt'];
  const restorePrompt = patch(promptModule, 'prompt', async () => answers.shift());

  try {
    await createProject(root);
    await generateCommand.run(['endpoint'], { cwd: root });
    const endpoint = await readFile(path.join(root, 'endpoints', 'PromptEndpoint.ts'), 'utf8');
    assert.equal(endpoint.includes("public path = '/prompt';"), true);
  } finally {
    restorePrompt();
    await removeTempDir(root);
  }
});

test('generate command rejects missing and unknown targets', async () => {
  const root = await createTempDir();

  try {
    await createProject(root);

    await assert.rejects(
      () => generateCommand.run([], { cwd: root }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal(error instanceof CliError, true);
        assert.equal((error as Error).message.includes('Select what to generate'), true);
        return true;
      },
    );

    await assert.rejects(
      () => generateCommand.run(['unknown'], { cwd: root }),
      /Unknown generate target: unknown/,
    );
  } finally {
    await removeTempDir(root);
  }
});

test('generate command warns when app class does not have rc-apps markers', async () => {
  const root = await createTempDir();
  const consoleCapture = captureConsole();

  try {
    await createProject(root, 'export class App extends Object {}');
    await generateCommand.run(['endpoint', 'broken', '--path', '/broken'], { cwd: root });

    const endpoint = await readFile(path.join(root, 'endpoints', 'Broken.ts'), 'utf8');
    assert.equal(endpoint.includes("public path = '/broken';"), true);
    assert.equal(
      consoleCapture.calls.warn.some((entry: string) => entry.includes('Auto-registration skipped for generated endpoint')),
      true,
    );
  } finally {
    consoleCapture.restore();
    await removeTempDir(root);
  }
});

test('generate command errors when class declaration cannot be located', async () => {
  const root = await createTempDir();

  try {
    await createProject(root, 'const broken = {};');
    await assert.rejects(
      () => generateCommand.run(['endpoint', 'broken', '--path', '/broken'], { cwd: root }),
      /Unable to locate app class declaration for generated registration/,
    );
  } finally {
    await removeTempDir(root);
  }
});

test('generate command errors when registration markers are malformed', async () => {
  const root = await createTempDir();

  try {
    await createProject(
      root,
      `export class App {
  protected async extendConfiguration(): Promise<void> {
    const endpoints = [
// rc-apps:api-endpoints
    ];
    const slashCommands = [
// rc-apps:slash-commands
    ];
    const appSettings = [
// rc-apps:settings
    ];
  }
}`,
    );

    await assert.rejects(
      () => generateCommand.run(['endpoint', 'broken', '--path', '/broken'], { cwd: root }),
      /Unable to locate generated marker/,
    );
  } finally {
    await removeTempDir(root);
  }
});
