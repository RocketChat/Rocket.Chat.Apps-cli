const test = require('node:test');
const assert = require('node:assert/strict');

const compiler = require('../lib/core/compiler.js');
const project = require('../lib/core/project.js');
const sourcePackager = require('../lib/core/source-packager.js');
const output = require('../lib/utils/output.js');
const { CliError } = require('../lib/core/errors.js');
const { packageCommand } = require('../lib/commands/package.js');
const { patchMany } = require('./helpers.ts');

test('package command uses compiler by default and supports legacy compiler mode', async () => {
  let buildArgs: { force: boolean; verbose: boolean; useNativeCompiler: boolean } | undefined;
  const calls: Array<['step' | 'success' | 'warn' | 'verbose', string]> = [];

  const restore = patchMany([
    {
      obj: project,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { nameSlug: 'a', version: '1.0.0' } }),
    },
    {
      obj: compiler,
      key: 'buildAndPackage',
      value: async (_project: unknown, options: unknown) => {
        buildArgs = options as { force: boolean; verbose: boolean; useNativeCompiler: boolean };
        return 'dist/a_1.0.0.zip';
      },
    },
    {
      obj: sourcePackager,
      key: 'packageSource',
      value: async () => {
        throw new Error('should not call source packager');
      },
    },
    { obj: output, key: 'step', value: (message: string) => { calls.push(['step', message]); } },
    { obj: output, key: 'success', value: (message: string) => { calls.push(['success', message]); } },
    { obj: output, key: 'warn', value: (message: string) => { calls.push(['warn', message]); } },
    { obj: output, key: 'verbose', value: (_enabled: boolean, message: string) => { calls.push(['verbose', message]); } },
  ]);

  try {
    await packageCommand.run(['--verbose', '--legacy-compiler'], { cwd: '/project' });
    assert.deepEqual(buildArgs, { force: false, verbose: true, useNativeCompiler: false });
    assert.equal(calls.some(([type, message]) => type === 'success' && message.includes('/project/dist/a_1.0.0.zip')), true);
  } finally {
    restore();
  }
});

test('package command supports --no-compile and warns for deprecated flags', async () => {
  let sourceCalled = false;
  const warnings: string[] = [];

  const restore = patchMany([
    {
      obj: project,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { nameSlug: 'a', version: '1.0.0' } }),
    },
    {
      obj: sourcePackager,
      key: 'packageSource',
      value: async () => {
        sourceCalled = true;
        return 'dist/a_1.0.0.zip';
      },
    },
    {
      obj: compiler,
      key: 'buildAndPackage',
      value: async () => {
        throw new Error('should not call compiler');
      },
    },
    { obj: output, key: 'warn', value: (message: string) => { warnings.push(message); } },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
  ]);

  try {
    await packageCommand.run(['--no-compile', '--legacy-compiler', '--experimental-native-compiler'], { cwd: '/project' });
    assert.equal(sourceCalled, true);
    assert.equal(warnings.some((msg) => msg.includes('--experimental-native-compiler')), true);
    assert.equal(warnings.some((msg) => msg.includes('Ignoring --legacy-compiler because --no-compile was provided')), true);
  } finally {
    restore();
  }
});

test('package command rejects zip paths outside project root', async () => {
  const restore = patchMany([
    {
      obj: project,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { nameSlug: 'a', version: '1.0.0' } }),
    },
    { obj: compiler, key: 'buildAndPackage', value: async () => '../outside.zip' },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    { obj: output, key: 'warn', value: () => {} },
  ]);

  try {
    await assert.rejects(
      () => packageCommand.run([], { cwd: '/project' }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal(error instanceof CliError, true);
        assert.equal((error as Error).message, 'Unexpected zip output path.');
        return true;
      },
    );
  } finally {
    restore();
  }
});
