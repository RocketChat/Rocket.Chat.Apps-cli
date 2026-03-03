const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGlobMatcher } = require('../lib/utils/glob.js');

test('glob matcher handles nested patterns and Windows paths', () => {
  const match = buildGlobMatcher(['**/dist/**', '**/*.test.ts']);

  assert.equal(match('src/dist/file.js'), true);
  assert.equal(match('src\\dist\\file.js'), true);
  assert.equal(match('src/main.test.ts'), true);
  assert.equal(match('src/main.ts'), false);
});

test('glob matcher escapes regex characters in literals', () => {
  const match = buildGlobMatcher(['src/file(+).ts']);
  assert.equal(match('src/file(+).ts'), true);
  assert.equal(match('src/fileaaa.ts'), false);
});
