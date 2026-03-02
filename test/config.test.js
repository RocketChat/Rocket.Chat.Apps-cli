const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeDeployConfig } = require('../lib/core/project.js');

test('mergeDeployConfig overrides only defined CLI values', () => {
  const merged = mergeDeployConfig(
    { url: 'http://localhost:3000', username: 'base', password: 'base-pass' },
    { username: 'cli', password: '', token: undefined },
  );

  assert.equal(merged.url, 'http://localhost:3000');
  assert.equal(merged.username, 'cli');
  assert.equal(merged.password, 'base-pass');
});
