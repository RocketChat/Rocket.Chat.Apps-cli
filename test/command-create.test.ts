const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const childProcess = require('node:child_process');
const { access, mkdir, readFile, writeFile } = require('node:fs/promises');

const promptModule = require('../lib/utils/prompt.js');
const { CliError } = require('../lib/core/errors.js');
const { createTempDir, patch, removeTempDir, requireFresh } = require('./helpers.ts');

test('create command scaffolds app with skip-install and detected apps-engine version', async () => {
  const root = await createTempDir();

  try {
    await mkdir(path.join(root, 'workspace'), { recursive: true });
    await writeFile(
      path.join(root, 'workspace', 'package.json'),
      JSON.stringify({ dependencies: { '@rocket.chat/apps-engine': '^9.9.9' } }, null, 2),
      'utf8',
    );

    const { createCommand } = requireFresh('../lib/commands/create.js');
    await createCommand.run(
      [
        'temp-app',
        '--skip-install',
        '--description',
        'desc',
        '--author',
        'author',
        '--support',
        'support@example.com',
        '--homepage',
        'https://example.com',
      ],
      { cwd: path.join(root, 'workspace') },
    );

    const appDir = path.join(root, 'workspace', 'temp-app');
    await access(path.join(appDir, 'app.json'));
    await access(path.join(appDir, 'src', 'TempApp.ts'));
    await access(path.join(appDir, 'icon.png'));

    const packageJson = await readFile(path.join(appDir, 'package.json'), 'utf8');
    assert.equal(packageJson.includes('"@rocket.chat/apps-engine": "^9.9.9"'), true);
    assert.equal(packageJson.includes('"@rocket.chat/ui-kit"'), true);
  } finally {
    await removeTempDir(root);
  }
});

test('create command rejects existing target directory without --force', async () => {
  const root = await createTempDir();

  try {
    await mkdir(path.join(root, 'temp-app'), { recursive: true });
    const { createCommand } = requireFresh('../lib/commands/create.js');

    await assert.rejects(
      () =>
        createCommand.run(
          [
            'temp-app',
            '--skip-install',
            '--description',
            'desc',
            '--author',
            'author',
            '--support',
            'support@example.com',
            '--homepage',
            'https://example.com',
          ],
          { cwd: root },
        ),
      /Directory already exists/,
    );
  } finally {
    await removeTempDir(root);
  }
});

test('create command rejects empty app name from prompt', async () => {
  const root = await createTempDir();
  const restorePrompt = patch(promptModule, 'prompt', async () => '   ');

  try {
    const { createCommand } = requireFresh('../lib/commands/create.js');
    await assert.rejects(
      () => createCommand.run([], { cwd: root }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal(error instanceof CliError, true);
        assert.equal((error as Error).message, 'App name is required.');
        return true;
      },
    );
  } finally {
    restorePrompt();
    await removeTempDir(root);
  }
});

test('create command surfaces npm install failures when --skip-install is not used', async () => {
  const root = await createTempDir();
  const restoreExec = patch(
    childProcess,
    'execFile',
    (_cmd: unknown, _args: unknown, _options: unknown, callback: (error: Error | null) => void) => callback(new Error('fail')),
  );

  try {
    const { createCommand } = requireFresh('../lib/commands/create.js');
    await assert.rejects(
      () =>
        createCommand.run(
          [
            'temp-app',
            '--description',
            'desc',
            '--author',
            'author',
            '--support',
            'support@example.com',
            '--homepage',
            'https://example.com',
          ],
          { cwd: root },
        ),
      /Failed to run npm install for the generated app/,
    );
  } finally {
    restoreExec();
    await removeTempDir(root);
  }
});

test('create command runs npm install successfully when enabled', async () => {
  const root = await createTempDir();
  let installCall: { cmd: string; args: string[]; options: { cwd?: string } } | undefined;
  const restoreExec = patch(
    childProcess,
    'execFile',
    (cmd: unknown, args: unknown, options: unknown, callback: (error: Error | null) => void) => {
      installCall = {
        cmd: String(cmd),
        args: Array.isArray(args) ? args.map((arg) => String(arg)) : [],
        options: typeof options === 'object' && options !== null ? (options as { cwd?: string }) : {},
      };
      callback(null);
    },
  );

  try {
    const { createCommand } = requireFresh('../lib/commands/create.js');
    await createCommand.run(
      [
        'installed-app',
        '--description',
        'desc',
        '--author',
        'author',
        '--support',
        'support@example.com',
        '--homepage',
        'https://example.com',
      ],
      { cwd: root },
    );

    if (!installCall) {
      throw new Error('Expected npm install call.');
    }

    assert.equal(installCall.args.join(' '), 'install');
    assert.equal(typeof installCall.options.cwd === 'string', true);
    assert.equal(installCall.options.cwd?.endsWith(path.join(root, 'installed-app')), true);
  } finally {
    restoreExec();
    await removeTempDir(root);
  }
});
