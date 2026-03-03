const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { mkdtemp, rm } = require('node:fs/promises');

interface PatchEntry {
  obj: unknown;
  key: PropertyKey;
  value: unknown;
}

interface CapturedConsole {
  log: string[];
  warn: string[];
  error: string[];
}

async function createTempDir(prefix = 'rc-apps-cli-test-'): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function removeTempDir(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

function requireFresh<T = unknown>(modulePath: string): T {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath) as T;
}

function patch(obj: unknown, key: PropertyKey, value: unknown): () => void {
  const target = obj as Record<PropertyKey, unknown>;
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function patchMany(entries: PatchEntry[]): () => void {
  const restores = entries.map(({ obj, key, value }) => patch(obj, key, value));
  return () => {
    for (const restore of restores.reverse()) {
      restore();
    }
  };
}

function captureConsole(): { calls: CapturedConsole; restore: () => void } {
  const calls: CapturedConsole = {
    log: [] as string[],
    warn: [] as string[],
    error: [] as string[],
  };

  const restore = patchMany([
    { obj: console, key: 'log', value: (...args: unknown[]) => { calls.log.push(args.map(String).join(' ')); } },
    { obj: console, key: 'warn', value: (...args: unknown[]) => { calls.warn.push(args.map(String).join(' ')); } },
    { obj: console, key: 'error', value: (...args: unknown[]) => { calls.error.push(args.map(String).join(' ')); } },
  ]);

  return { calls, restore };
}

async function waitForMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function assertIncludes(collection: string[], expected: string): void {
  assert.equal(collection.some((entry) => entry.includes(expected)), true, `Expected "${expected}" in collection.`);
}

module.exports = {
  assertIncludes,
  captureConsole,
  createTempDir,
  patch,
  patchMany,
  removeTempDir,
  requireFresh,
  waitForMicrotasks,
};
