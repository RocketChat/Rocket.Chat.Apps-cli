const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { mkdir, rm, writeFile } = require('node:fs/promises');

const compiler = require('../lib/core/compiler.js');
const deployCore = require('../lib/core/deploy.js');
const envCore = require('../lib/core/env.js');
const projectCore = require('../lib/core/project.js');
const output = require('../lib/utils/output.js');
const { watchCommand } = require('../lib/commands/watch.js');
const { createTempDir, patchMany, removeTempDir } = require('./helpers.ts');

type WatchEventHandler = (eventType: string, fileName: string | Buffer | null) => void;
type FakeWatcher = import('node:events').EventEmitter & { close: () => void };

async function waitForSigintListenerIncrease(initialCount: number): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (process.listenerCount('SIGINT') > initialCount) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  throw new Error('Timed out waiting for SIGINT listener registration.');
}

test('watch command handles deprecated flag, watcher events, queueing, and exits on SIGINT', async () => {
  let uploadCount = 0;
  let buildCount = 0;
  let releaseSecondBuild: (() => void) | undefined;
  let clearTimeoutCount = 0;
  let watchCallback: WatchEventHandler | undefined;
  const fakeWatcher = new EventEmitter() as FakeWatcher;
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

    const initialSigintListeners = process.listenerCount('SIGINT');
    const runPromise = watchCommand.run(['--debounce', '0', '--experimental-native-compiler'], { cwd: '/project' });

    await new Promise((resolve) => setImmediate(resolve));
    const onWatchEvent = watchCallback;
    if (!onWatchEvent) {
      throw new Error('Expected watch callback to be registered.');
    }
    onWatchEvent('change', null);
    onWatchEvent('change', '../outside.ts');
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
    await waitForSigintListenerIncrease(initialSigintListeners);
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
  const fakeWatcher = new EventEmitter() as FakeWatcher;
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
    const initialSigintListeners = process.listenerCount('SIGINT');
    const runPromise = watchCommand.run(['--debounce', '0'], { cwd: '/project' });
    await new Promise((resolve) => setImmediate(resolve));
    const onWatchEvent = watchCallback;
    if (!onWatchEvent) {
      throw new Error('Expected watch callback to be registered.');
    }
    onWatchEvent('change', 'src/App.ts');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await waitForSigintListenerIncrease(initialSigintListeners);
    process.emit('SIGINT');
    await runPromise;

    assert.equal(failedMessage.includes('Watch deployment failed: boom'), true);
  } finally {
    restore();
  }
});

test('watch command preserves allow-http/update precedence and uses linux fallback watcher mode', async () => {
  const root = await createTempDir();
  await mkdir(path.join(root, 'nested', 'deep'), { recursive: true });
  await writeFile(path.join(root, 'file.txt'), 'x', 'utf8');

  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: 'linux' });

  let validatedConfig: Record<string, unknown> | undefined;
  const warnings: string[] = [];
  const watcherRecords: Array<{
    callback: WatchEventHandler;
    recursive: boolean;
    watcher: FakeWatcher;
    watchPath: string;
  }> = [];

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: root, appJsonPath: path.join(root, 'app.json'), manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
    },
    { obj: projectCore, key: 'loadConfigFile', value: async () => ({ config: { allowHttp: true, update: true }, legacyFields: [] }) },
    {
      obj: envCore,
      key: 'loadDeployConfigFromEnv',
      value: () => ({ url: 'http://localhost:3000', username: 'user', password: 'pass' }),
    },
    {
      obj: deployCore,
      key: 'validateDeployCredentials',
      value: (config: unknown) => {
        validatedConfig = config as Record<string, unknown>;
      },
    },
    { obj: deployCore, key: 'getServerInfo', value: async () => ({}) },
    { obj: deployCore, key: 'loadIgnoredPatterns', value: async () => [] },
    { obj: compiler, key: 'buildAndPackage', value: async () => 'dist/a_1.0.0.zip' },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'update' }) },
    { obj: output, key: 'warn', value: (message: string) => { warnings.push(message); } },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    {
      obj: fs,
      key: 'watch',
      value: (watchPath: unknown, options: unknown, callback: WatchEventHandler) => {
        const fakeWatcher = new EventEmitter() as FakeWatcher;
        fakeWatcher.close = () => {};
        watcherRecords.push({
          callback,
          recursive: Boolean((options as { recursive?: boolean }).recursive),
          watcher: fakeWatcher,
          watchPath: String(watchPath),
        });
        return fakeWatcher;
      },
    },
  ]);

  const initialSigintListeners = process.listenerCount('SIGINT');

  try {
    const runPromise = watchCommand.run([], { cwd: root });
    await waitForSigintListenerIncrease(initialSigintListeners);

    assert.equal(validatedConfig?.allowHttp, true);
    assert.equal(validatedConfig?.update, true);
    assert.equal(warnings.some((message) => message.includes('Recursive fs.watch is not supported on this platform')), true);
    assert.equal(watcherRecords.length >= 3, true);
    assert.equal(watcherRecords.every((record) => record.recursive === false), true);

    await rm(path.join(root, 'nested', 'deep'), { recursive: true, force: true });
    await mkdir(path.join(root, 'nested', 'added'), { recursive: true });
    const rootWatcher = watcherRecords.find((record) => record.watchPath === root);
    if (!rootWatcher) {
      throw new Error('Expected root watcher record.');
    }
    rootWatcher.callback('rename', 'nested');
    await new Promise((resolve) => setTimeout(resolve, 20));

    process.emit('SIGINT');
    await runPromise;

    assert.equal(process.listenerCount('SIGINT'), initialSigintListeners);
  } finally {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    restore();
    await removeTempDir(root);
  }
});

test('watch command linux fallback handles missing directories during scan', async () => {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: 'linux' });

  const fakeWatcher = new EventEmitter() as FakeWatcher;
  fakeWatcher.close = () => {};

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: '/path-that-does-not-exist', appJsonPath: '/path-that-does-not-exist/app.json', manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
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
    { obj: compiler, key: 'buildAndPackage', value: async () => 'dist/a_1.0.0.zip' },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'update' }) },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    { obj: fs, key: 'watch', value: (_target: unknown, _options: unknown, _callback: WatchEventHandler) => fakeWatcher },
  ]);

  try {
    const initialSigintListeners = process.listenerCount('SIGINT');
    const runPromise = watchCommand.run([], { cwd: '/project' });
    await waitForSigintListenerIncrease(initialSigintListeners);
    process.emit('SIGINT');
    await runPromise;
  } finally {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    restore();
  }
});

test('watch command applies allow-http/update flags when explicitly provided', async () => {
  let validatedConfig: Record<string, unknown> | undefined;
  const fakeWatcher = new EventEmitter() as FakeWatcher;
  fakeWatcher.close = () => {};

  const restore = patchMany([
    {
      obj: projectCore,
      key: 'loadProject',
      value: async () => ({ rootPath: '/project', appJsonPath: '/project/app.json', manifest: { id: 'app.id', nameSlug: 'a', version: '1.0.0' } }),
    },
    { obj: projectCore, key: 'loadConfigFile', value: async () => ({ config: { allowHttp: false, update: false }, legacyFields: [] }) },
    {
      obj: envCore,
      key: 'loadDeployConfigFromEnv',
      value: () => ({ url: 'http://localhost:3000', username: 'user', password: 'pass' }),
    },
    {
      obj: deployCore,
      key: 'validateDeployCredentials',
      value: (config: unknown) => {
        validatedConfig = config as Record<string, unknown>;
      },
    },
    { obj: deployCore, key: 'getServerInfo', value: async () => ({}) },
    { obj: deployCore, key: 'loadIgnoredPatterns', value: async () => [] },
    { obj: compiler, key: 'buildAndPackage', value: async () => 'dist/a_1.0.0.zip' },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'update' }) },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    { obj: fs, key: 'watch', value: (_target: unknown, _options: unknown, _callback: WatchEventHandler) => fakeWatcher },
  ]);

  try {
    const initialSigintListeners = process.listenerCount('SIGINT');
    const runPromise = watchCommand.run(['--allow-http', '--update'], { cwd: '/project' });
    await waitForSigintListenerIncrease(initialSigintListeners);
    process.emit('SIGINT');
    await runPromise;

    assert.equal(validatedConfig?.allowHttp, true);
    assert.equal(validatedConfig?.update, true);
  } finally {
    restore();
  }
});

test('watch command rejects when watcher emits error and cleans up listeners', async () => {
  const fakeWatcher = new EventEmitter() as FakeWatcher;
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
    { obj: compiler, key: 'buildAndPackage', value: async () => 'dist/a_1.0.0.zip' },
    { obj: deployCore, key: 'uploadApp', value: async () => ({ mode: 'update' }) },
    { obj: output, key: 'warn', value: () => {} },
    { obj: output, key: 'step', value: () => {} },
    { obj: output, key: 'success', value: () => {} },
    { obj: output, key: 'failure', value: () => {} },
    { obj: output, key: 'verbose', value: () => {} },
    { obj: fs, key: 'watch', value: (_target: unknown, _options: unknown, _callback: WatchEventHandler) => fakeWatcher },
  ]);

  const initialSigintListeners = process.listenerCount('SIGINT');

  try {
    const runPromise = watchCommand.run([], { cwd: '/project' });
    await waitForSigintListenerIncrease(initialSigintListeners);
    const error = new Error('watch exploded');

    fakeWatcher.emit('error', error);

    await assert.rejects(runPromise, (receivedError: unknown) => {
      assert.equal(receivedError, error);
      return true;
    });
    assert.equal(process.listenerCount('SIGINT'), initialSigintListeners);
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
