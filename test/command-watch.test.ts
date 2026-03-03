const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');

const compiler = require('../lib/core/compiler.js');
const deployCore = require('../lib/core/deploy.js');
const envCore = require('../lib/core/env.js');
const projectCore = require('../lib/core/project.js');
const output = require('../lib/utils/output.js');
const { watchCommand } = require('../lib/commands/watch.js');
const { patchMany } = require('./helpers.ts');

type WatchEventHandler = (eventType: string, fileName: string | Buffer | null) => void;

test('watch command handles deprecated flag, watcher events, queueing, and exits on SIGINT', async () => {
  let uploadCount = 0;
  let buildCount = 0;
  let releaseSecondBuild: (() => void) | undefined;
  let clearTimeoutCount = 0;
  let watchCallback: WatchEventHandler | undefined;
  const fakeWatcher = new EventEmitter() as import('node:events').EventEmitter & { close: () => void };
  fakeWatcher.close = () => {};

  const originalClearTimeout = global.clearTimeout;

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
    },
    { obj: projectCore, key: 'loadConfigFile', value: async () => ({ config: {}, legacyFields: ['token'] }) },
    {
      obj: envCore,
      key: 'loadDeployConfigFromEnv',
      value: () => ({ url: 'http://localhost:3000', username: 'user', password: 'pass' }),
    },
    { obj: deployCore, key: 'validateDeployCredentials', value: () => {} },
    { obj: deployCore, key: 'getServerInfo', value: async () => ({}) },
    { obj: deployCore, key: 'loadIgnoredPatterns', value: async () => ['**/dist/**'] },
    {
      obj: compiler,
      key: 'buildAndPackage',
      value: async () => {
        buildCount += 1;

        if (buildCount === 2) {
          await new Promise<void>((resolve) => {
            releaseSecondBuild = () => resolve();
          });
        }

        return 'dist/a_1.0.0.zip';
      },
    },
    {
      obj: deployCore,
      key: 'uploadApp',
      value: async () => {
        uploadCount += 1;
        return { mode: 'update' };
      },
    },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    {
      obj: fs,
      key: 'watch',
      value: (_target: unknown, _options: unknown, callback: WatchEventHandler) => {
        watchCallback = callback;
        return fakeWatcher;
      },
    },
  ]);

  try {
    global.clearTimeout = ((timer: Parameters<typeof clearTimeout>[0]) => {
      clearTimeoutCount += 1;
      return originalClearTimeout(timer);
    }) as typeof clearTimeout;

    const runPromise = watchCommand.run(['--debounce', '0', '--experimental-native-compiler'], { cwd: '/project' });

    await new Promise((resolve) => setImmediate(resolve));
    const onWatchEvent = watchCallback;
    if (!onWatchEvent) {
      throw new Error('Expected watch callback to be registered.');
    }
    onWatchEvent('change', null);
    onWatchEvent('change', 'src/dist/ignored.ts');
    onWatchEvent('change', 'src/App.ts');
    onWatchEvent('change', 'src/App2.ts');
    await new Promise((resolve) => setTimeout(resolve, 5));
    onWatchEvent('change', 'src/App3.ts');
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (!releaseSecondBuild) {
      throw new Error('Expected queued build to be waiting.');
    }
    releaseSecondBuild();
    await new Promise((resolve) => setTimeout(resolve, 5));
    process.emit('SIGINT');
    await runPromise;

    assert.equal(uploadCount >= 3, true);
    assert.equal(clearTimeoutCount >= 1, true);
  } finally {
    global.clearTimeout = originalClearTimeout;
    restore();
  }
});

test('watch command reports deployment errors and keeps running', async () => {
  let failedMessage = '';
  let watchCallback: WatchEventHandler | undefined;
  const fakeWatcher = new EventEmitter() as import('node:events').EventEmitter & { close: () => void };
  fakeWatcher.close = () => {};

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
    { obj: deployCore, key: 'loadIgnoredPatterns', value: async () => [] },
    { obj: compiler, key: 'buildAndPackage', value: async () => { throw new Error('boom'); } },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'update' }) },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: (message: string) => { failedMessage = message; } },
    { obj: output, key: 'verbose', value: () => {} },
    {
      obj: fs,
      key: 'watch',
      value: (_target: unknown, _options: unknown, callback: WatchEventHandler) => {
        watchCallback = callback;
        return fakeWatcher;
      },
    },
  ]);

  try {
    const runPromise = watchCommand.run(['--debounce', '0'], { cwd: '/project' });
    await new Promise((resolve) => setImmediate(resolve));
    const onWatchEvent = watchCallback;
    if (!onWatchEvent) {
      throw new Error('Expected watch callback to be registered.');
    }
    onWatchEvent('change', 'src/App.ts');
    await new Promise((resolve) => setTimeout(resolve, 5));
    process.emit('SIGINT');
    await runPromise;

    assert.equal(failedMessage.includes('Watch deployment failed: boom'), true);
  } finally {
    restore();
  }
});

test('watch command rejects invalid debounce values', async () => {
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
    { obj: deployCore, key: 'loadIgnoredPatterns', value: async () => [] },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
  ]);

  try {
    await assert.rejects(
      () => watchCommand.run(['--debounce=-1'], { cwd: '/project' }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal((error as Error).message, 'Invalid --debounce value.');
        return true;
      },
    );
  } finally {
    restore();
  }
});
