const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, readFile, writeFile } = require('node:fs/promises');

const promptModule = require('../lib/utils/prompt.js');
const { generateCommand } = require('../lib/commands/generate.js');
const { CliError } = require('../lib/core/errors.js');
const { createTempDir, patch, removeTempDir } = require('./helpers.ts');

async function createProject(root: string): Promise<void> {
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
  await writeFile(path.join(root, 'src', 'App.ts'), 'export class App {}', 'utf8');
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
    assert.equal(endpoint.includes("public path = '/api-x';"), true);
    assert.equal(slash.includes("public command = 'myslash';"), true);
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
    assert.equal(settings.includes("id: 'first_setting'"), true);
    assert.equal(settings.includes("id: 'second_setting'"), true);
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
