const test = require('node:test');
const assert = require('node:assert/strict');

const compiler = require('../lib/core/compiler.js');
const deployCore = require('../lib/core/deploy.js');
const envCore = require('../lib/core/env.js');
const projectCore = require('../lib/core/project.js');
const output = require('../lib/utils/output.js');
const { deployCommand } = require('../lib/commands/deploy.js');
const { patchMany } = require('./helpers.ts');

test('deploy command runs full deploy pipeline and shows warnings', async () => {
  const calls: Array<['warn' | 'step' | 'success' | 'verbose', string]> = [];
  let validatedConfig: Record<string, unknown> | undefined;
  let uploadZipPath: string | undefined;

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
    },
    {
      obj: projectCore,
      key: 'loadConfigFile',
      value: async () => ({
        config: { allowHttp: true },
        legacyFields: ['url', 'username'],
      }),
    },
    { obj: envCore, key: 'loadDeployConfigFromEnv', value: () => ({ token: 'env-token', userId: 'env-user' }) },
    {
      obj: deployCore,
      key: 'validateDeployCredentials',
      value: (config: unknown) => {
        validatedConfig = config as Record<string, unknown>;
      },
    },
    { obj: deployCore, key: 'getServerInfo', value: async () => ({ version: '8.1' }) },
    { obj: compiler, key: 'buildAndPackage', value: async () => 'dist/a_1.0.0.zip' },
    {
      obj: deployCore,
      key: 'uploadApp',
      value: async (_config: unknown, _project: unknown, zipPath: unknown) => {
        uploadZipPath = String(zipPath);
        return { mode: 'update' };
      },
    },
    { obj: output, key: 'warn', value: (message: string) => { calls.push(['warn', message]); } },
    { obj: output, key: 'step', value: (message: string) => { calls.push(['step', message]); } },
    { obj: output, key: 'success', value: (message: string) => { calls.push(['success', message]); } },
    { obj: output, key: 'verbose', value: (_enabled: boolean, message: string) => { calls.push(['verbose', message]); } },
  ]);

  try {
    await deployCommand.run(['--experimental-native-compiler', '--verbose'], { cwd: '/project' });

    assert.equal(validatedConfig?.token, 'env-token');
    assert.equal(validatedConfig?.userId, 'env-user');
    assert.equal(uploadZipPath, '/project/dist/a_1.0.0.zip');
    assert.equal(calls.some(([type, message]) => type === 'warn' && message.includes('--experimental-native-compiler')), true);
    assert.equal(calls.some(([type, message]) => type === 'warn' && message.includes('Ignoring legacy .rcappsconfig field')), true);
    assert.equal(calls.some(([type, message]) => type === 'success' && message.includes('Deployment finished (update).')), true);
  } finally {
    restore();
  }
});

test('deploy command passes legacy compiler switch to build step', async () => {
  let compilerOptions: { force: boolean; verbose: boolean; useNativeCompiler: boolean } | undefined;

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
    },
    { obj: projectCore, key: 'loadConfigFile', value: async () => ({ config: {}, legacyFields: [] }) },
    {
      obj: envCore,
      key: 'loadDeployConfigFromEnv',
      value: () => ({ url: 'http://localhost:3000', username: 'user', password: 'pass' }),
    },
    { obj: deployCore, key: 'validateDeployCredentials', value: () => {} },
    { obj: deployCore, key: 'getServerInfo', value: async () => ({}) },
    {
      obj: compiler,
      key: 'buildAndPackage',
      value: async (_project: unknown, options: unknown) => {
        compilerOptions = options as { force: boolean; verbose: boolean; useNativeCompiler: boolean };
        return 'dist/a_1.0.0.zip';
      },
    },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'create' }) },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
  ]);

  try {
    await deployCommand.run(['--legacy-compiler'], { cwd: '/project' });
    assert.deepEqual(compilerOptions, { force: false, verbose: false, useNativeCompiler: false });
  } finally {
    restore();
  }
});
