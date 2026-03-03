const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFile, writeFile } = require('node:fs/promises');

const { ensureDirectory, writeJsonFile, readJsonFile, walkFiles } = require('../lib/utils/files.js');
const { createTempDir, removeTempDir } = require('./helpers.ts');

test('file helpers create directories, read/write json, and walk files recursively', async () => {
  const root = await createTempDir();

  try {
    const nested = path.join(root, 'a', 'b');
    await ensureDirectory(nested);

    const jsonPath = path.join(nested, 'data.json');
    await writeJsonFile(jsonPath, { a: 1, b: 'ok' });
    const json = await readJsonFile(jsonPath);
    assert.deepEqual(json, { a: 1, b: 'ok' });

    const jsonContent = await readFile(jsonPath, 'utf8');
    assert.equal(jsonContent.endsWith('\n'), true);

    await writeFile(path.join(root, 'root.txt'), 'x', 'utf8');
    await writeFile(path.join(nested, 'leaf.txt'), 'y', 'utf8');

    const files = await walkFiles(root);
    const relative = files.map((item: string) => path.relative(root, item).replace(/\\/g, '/')).sort();
    assert.deepEqual(relative, ['a/b/data.json', 'a/b/leaf.txt', 'root.txt']);
  } finally {
    await removeTempDir(root);
  }
});
