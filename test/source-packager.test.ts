const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, stat, writeFile } = require('node:fs/promises');

const { packageSource } = require('../lib/core/source-packager.js');
const { createTempDir, removeTempDir } = require('./helpers.ts');

test('packageSource creates a dist zip for source files', async () => {
  const root = await createTempDir();

  try {
    await mkdir(path.join(root, 'src'), { recursive: true });
    await writeFile(path.join(root, 'app.json'), '{"id":"x"}', 'utf8');
    await writeFile(path.join(root, 'src', 'App.ts'), 'export class App {}', 'utf8');
    await writeFile(path.join(root, 'README.md'), 'ignored', 'utf8');
    await writeFile(path.join(root, '.hidden'), 'ignored', 'utf8');

    const zipRelativePath = await packageSource({
      rootPath: root,
      appJsonPath: path.join(root, 'app.json'),
      manifest: { nameSlug: 'demo', version: '0.0.1' },
    });

    assert.equal(zipRelativePath, path.join('dist', 'demo_0.0.1.zip'));

    const zipAbsolutePath = path.join(root, zipRelativePath);
    const info = await stat(zipAbsolutePath);
    assert.equal(info.isFile(), true);
    assert.equal(info.size > 0, true);
  } finally {
    await removeTempDir(root);
  }
});

test('packageSource fails when every file is ignored', async () => {
  const root = await createTempDir();

  try {
    await mkdir(path.join(root, 'nested', 'dist'), { recursive: true });
    await mkdir(path.join(root, 'nested', '.git'), { recursive: true });
    await writeFile(path.join(root, 'nested', 'dist', 'already.zip'), 'x', 'utf8');
    await writeFile(path.join(root, 'nested', '.git', 'config'), 'x', 'utf8');
    await writeFile(path.join(root, 'nested', '.env'), 'x', 'utf8');

    await assert.rejects(
      () =>
        packageSource({
          rootPath: root,
          appJsonPath: path.join(root, 'app.json'),
          manifest: { nameSlug: 'demo', version: '0.0.1' },
        }),
      /No files to package were found/,
    );
  } finally {
    await removeTempDir(root);
  }
});
