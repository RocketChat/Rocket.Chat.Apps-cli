const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fsPromises = require('node:fs/promises');
const { mkdir, writeFile } = require('node:fs/promises');

const { loadProject, loadConfigFile } = require('../lib/core/project.js');
const { CliError } = require('../lib/core/errors.js');
const { createTempDir, patch, removeTempDir } = require('./helpers.ts');

async function writeValidProject(root: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const manifest = {
    id: 'id',
    name: 'name',
    nameSlug: 'name',
    version: '1.0.0',
    requiredApiVersion: '^1.0.0',
    description: 'desc',
    author: { name: 'n', support: 's' },
    classFile: 'src/App.ts',
    iconFile: 'icon.png',
    ...overrides,
  };

  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'src', 'App.ts'), 'export class App {}', 'utf8');
  await writeFile(path.join(root, 'icon.png'), '', 'utf8');
  await writeFile(path.join(root, 'app.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

test('loadProject loads a valid app project', async () => {
  const root = await createTempDir();

  try {
    await writeValidProject(root);
    const project = await loadProject(root);

    assert.equal(project.rootPath, path.resolve(root));
    assert.equal(project.manifest.nameSlug, 'name');
    assert.equal(project.appJsonPath.endsWith('app.json'), true);
  } finally {
    await removeTempDir(root);
  }
});

test('loadProject fails when app.json is missing', async () => {
  const root = await createTempDir();
  await assert.rejects(() => loadProject(root), (error: unknown) => {
    assert.equal(error instanceof Error, true);
    assert.equal(error instanceof CliError, true);
    assert.equal((error as Error).message.includes('Missing app.json'), true);
    return true;
  });
  await removeTempDir(root);
});

test('loadProject fails with invalid json', async () => {
  const root = await createTempDir();

  try {
    await writeFile(path.join(root, 'app.json'), '{not-json', 'utf8');
    await assert.rejects(() => loadProject(root), (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'app.json is not valid JSON.');
      return true;
    });
  } finally {
    await removeTempDir(root);
  }
});

test('loadProject validates required fields and author', async () => {
  const root = await createTempDir();

  try {
    await writeValidProject(root, { id: '' });
    await assert.rejects(() => loadProject(root), /Missing required field: id/);

    await writeValidProject(root, { author: { name: 'n' } });
    await assert.rejects(() => loadProject(root), /author\.name and author\.support are required/);
  } finally {
    await removeTempDir(root);
  }
});

test('loadProject validates classFile path exists and is file', async () => {
  const root = await createTempDir();

  try {
    await writeValidProject(root, { classFile: 'src/NotFound.ts' });
    await assert.rejects(() => loadProject(root), /classFile does not exist/);
  } finally {
    await removeTempDir(root);
  }
});

test('loadProject executes not-a-file branch before final classFile error', async () => {
  const root = await createTempDir();
  const restoreStat = patch(fsPromises, 'stat', async () => ({ isFile: () => false }));

  try {
    await writeValidProject(root);
    await assert.rejects(() => loadProject(root), /classFile does not exist/);
  } finally {
    restoreStat();
    await removeTempDir(root);
  }
});

test('loadConfigFile handles modern, legacy, invalid, and missing files', async () => {
  const root = await createTempDir();

  try {
    await writeFile(
      path.join(root, '.rcappsconfig'),
      JSON.stringify(
        {
          ignoredFiles: ['**/tmp/**'],
          allowHttp: true,
          url: 'http://old',
          username: 'legacy',
        },
        null,
        2,
      ),
      'utf8',
    );

    const loaded = await loadConfigFile(root);
    assert.equal(loaded.config.allowHttp, true);
    assert.deepEqual(loaded.config.ignoredFiles, ['**/tmp/**']);
    assert.deepEqual(loaded.legacyFields.sort(), ['url', 'username']);

    await writeFile(path.join(root, '.rcappsconfig'), 'not-json', 'utf8');
    const invalid = await loadConfigFile(root);
    assert.deepEqual(invalid, { config: {}, legacyFields: [] });

    const missing = await loadConfigFile(path.join(root, 'missing'));
    assert.deepEqual(missing, { config: {}, legacyFields: [] });
  } finally {
    await removeTempDir(root);
  }
});
