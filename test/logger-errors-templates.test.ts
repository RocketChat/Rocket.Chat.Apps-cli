const test = require('node:test');
const assert = require('node:assert/strict');

const { Logger } = require('../lib/core/logger.js');
const { CliError } = require('../lib/core/errors.js');
const templates = require('../lib/core/templates.js');
const { captureConsole } = require('./helpers.ts');

test('Logger prints info/warn/error and gates verbose', () => {
  const { calls, restore } = captureConsole();

  try {
    const quiet = new Logger(false);
    quiet.info('info');
    quiet.warn('warn');
    quiet.error('error');
    quiet.verbose('hidden');

    const loud = new Logger(true);
    loud.verbose('shown');
  } finally {
    restore();
  }

  assert.equal(calls.log.includes('info'), true);
  assert.equal(calls.warn.includes('warn'), true);
  assert.equal(calls.error.includes('error'), true);
  assert.equal(calls.log.includes('hidden'), false);
  assert.equal(calls.log.includes('shown'), true);
});

test('CliError stores exit code', () => {
  const error = new CliError('boom', 9);
  assert.equal(error.name, 'CliError');
  assert.equal(error.message, 'boom');
  assert.equal(error.exitCode, 9);
});

test('template helpers render expected values', () => {
  const manifest = {
    name: 'App Name',
    description: 'App description',
  };

  assert.equal(templates.appClassTemplate('MyApp').includes('class MyApp extends App'), true);
  assert.equal(templates.appReadmeTemplate(manifest).includes('# App Name'), true);
  assert.equal(templates.appTsConfigTemplate().includes('"target": "ES2021"'), true);

  const packageJson = templates.appPackageJsonTemplate('my-app', '^1.0.0');
  assert.equal(packageJson.includes('"name": "my-app"'), true);
  assert.equal(packageJson.includes('"@rocket.chat/apps-engine": "^1.0.0"'), true);

  assert.equal(templates.endpointTemplate('TestEndpoint', '/x').includes("public path = '/x';"), true);
  assert.equal(templates.slashCommandTemplate('MyCommand').includes("public command = 'mycommand';"), true);
  assert.equal(templates.initialSettingsTemplate().includes('export const settings: ISetting[] = [];'), true);

  const appendedToInitial = templates.appendSettingTemplate(templates.initialSettingsTemplate(), 'my_setting');
  assert.equal(appendedToInitial.includes("id: 'my_setting'"), true);

  const appendedToExisting = templates.appendSettingTemplate("settings.push({ id: 'a' });\n", 'new_id');
  assert.equal(appendedToExisting.includes("id: 'new_id'"), true);
});
