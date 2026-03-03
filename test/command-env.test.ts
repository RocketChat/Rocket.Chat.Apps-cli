const test = require('node:test');
const assert = require('node:assert/strict');

const { envCommand } = require('../lib/commands/env.js');
const { captureConsole } = require('./helpers.ts');

test('env command prints supported variables and precedence', async () => {
  const { calls, restore } = captureConsole();

  try {
    await envCommand.run([], { cwd: process.cwd() });
  } finally {
    restore();
  }

  const text = calls.log.join('\n');
  assert.equal(text.includes('Environment Variables'), true);
  assert.equal(text.includes('RC_APPS_URL'), true);
  assert.equal(text.includes('Precedence: CLI flags > environment variables > .rcappsconfig'), true);
});
