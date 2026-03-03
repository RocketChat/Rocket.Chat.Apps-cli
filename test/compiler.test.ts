const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');

const { CliError } = require('../lib/core/errors.js');
const { createTempDir, removeTempDir, requireFresh, captureConsole } = require('./helpers.ts');

const appsCompilerPath = require.resolve('@rocket.chat/apps-compiler');

type BuildAndPackage = typeof import('../lib/core/compiler.js').buildAndPackage;
type ProjectContext = import('../lib/core/project.js').ProjectContext;
type AppManifest = import('../lib/core/types.js').AppManifest;

type CompilerCall =
  | { type: 'ctor'; metadata: unknown; projectPath: string; ts: unknown; useNativeCompiler: boolean }
  | { type: 'compile' }
  | { type: 'bundle' }
  | { type: 'outputZip'; name: string };

async function makeProjectRoot(): Promise<string> {
  const root = await createTempDir();
  await mkdir(path.join(root, 'node_modules', 'typescript'), { recursive: true });
  await writeFile(path.join(root, 'node_modules', 'typescript', 'index.js'), 'module.exports = { version: "5.x" };', 'utf8');
  await writeFile(path.join(root, 'app.json'), '{}', 'utf8');
  return root;
}

async function withFakeAppsCompiler(
  FakeCompiler: { prototype: unknown },
  run: (buildAndPackage: BuildAndPackage) => Promise<void>,
): Promise<void> {
  require(appsCompilerPath);
  const moduleRecord = require.cache[appsCompilerPath];
  if (!moduleRecord) {
    throw new Error('Unable to resolve apps-compiler module cache.');
  }
  const originalExports = moduleRecord.exports;
  moduleRecord.exports = { AppsCompiler: FakeCompiler };
  delete require.cache[require.resolve('../lib/core/compiler.js')];

  try {
    const { buildAndPackage } = requireFresh('../lib/core/compiler.js');
    return await run(buildAndPackage);
  } finally {
    delete require.cache[require.resolve('../lib/core/compiler.js')];
    moduleRecord.exports = originalExports;
  }
}

function makeManifest(version: string): AppManifest {
  return {
    id: 'id',
    name: 'demo',
    nameSlug: 'demo',
    version,
    requiredApiVersion: '^1.0.0',
    description: 'desc',
    author: { name: 'n', support: 's' },
    classFile: 'src/App.ts',
    iconFile: 'icon.png',
  };
}

function makeProjectContext(root: string, version: string): ProjectContext {
  return {
    rootPath: root,
    appJsonPath: path.join(root, 'app.json'),
    manifest: makeManifest(version),
  };
}

test('buildAndPackage compiles, bundles, and writes zip', async () => {
  const root = await makeProjectRoot();
  const calls: CompilerCall[] = [];

  class FakeCompiler {
    constructor(metadata: unknown, projectPath: string, ts: unknown, useNativeCompiler: boolean) {
      calls.push({ type: 'ctor', metadata, projectPath, ts, useNativeCompiler });
    }

    async compile() {
      calls.push({ type: 'compile' });
      return { diagnostics: [], typeScriptVersion: '5.7.2' };
    }

    async bundle() {
      calls.push({ type: 'bundle' });
      return { diagnostics: [] };
    }

    async outputZip(name: string) {
      calls.push({ type: 'outputZip', name });
    }
  }

  const { calls: consoleCalls, restore: restoreConsole } = captureConsole();

  try {
    await withFakeAppsCompiler(FakeCompiler, async (buildAndPackage) => {
      const zipName = await buildAndPackage(
        makeProjectContext(root, '1.2.3'),
        { force: false, verbose: true, useNativeCompiler: true },
      );

      assert.equal(zipName, path.join('dist', 'demo_1.2.3.zip'));
    });

    const firstCall = calls[0];
    assert.equal(firstCall?.type, 'ctor');
    if (!firstCall || firstCall.type !== 'ctor') {
      throw new Error('Expected constructor call.');
    }
    assert.equal(firstCall.projectPath, root);
    assert.equal(firstCall.useNativeCompiler, true);
    assert.equal(calls.some((item) => item.type === 'compile'), true);
    assert.equal(calls.some((item) => item.type === 'bundle'), true);
    assert.equal(calls.some((item) => item.type === 'outputZip' && item.name === path.join('dist', 'demo_1.2.3.zip')), true);
    assert.equal(consoleCalls.log.some((line: string) => line.includes('using TypeScript 5.7.2')), true);
  } finally {
    restoreConsole();
    await removeTempDir(root);
  }
});

test('buildAndPackage throws for compile diagnostics unless force is true', async () => {
  const root = await makeProjectRoot();

  class FakeCompiler {
    async compile() {
      return { diagnostics: [{ message: 'compile failed' }] };
    }

    async bundle() {
      return { diagnostics: [] };
    }

    async outputZip() {}
  }

  try {
    await withFakeAppsCompiler(FakeCompiler, async (buildAndPackage) => {
      await assert.rejects(
        () =>
          buildAndPackage(
            makeProjectContext(root, '1.2.3'),
            { force: false, verbose: false, useNativeCompiler: false },
          ),
        /TypeScript errors occurred:\ncompile failed/,
      );

      await assert.doesNotReject(() =>
        buildAndPackage(
          makeProjectContext(root, '1.2.3'),
          { force: true, verbose: false, useNativeCompiler: false },
        ),
      );
    });
  } finally {
    await removeTempDir(root);
  }
});

test('buildAndPackage throws for bundler diagnostics', async () => {
  const root = await makeProjectRoot();

  class FakeCompiler {
    async compile() {
      return { diagnostics: [] };
    }

    async bundle() {
      return { diagnostics: [{ message: 'bundle failed' }] };
    }

    async outputZip() {}
  }

  try {
    await withFakeAppsCompiler(FakeCompiler, async (buildAndPackage) => {
      await assert.rejects(
        () =>
          buildAndPackage(
            makeProjectContext(root, '1.2.3'),
            { force: false, verbose: false, useNativeCompiler: false },
          ),
        /Bundler errors occurred:\nbundle failed/,
      );
    });
  } finally {
    await removeTempDir(root);
  }
});

test('buildAndPackage throws when app project has no TypeScript dependency', async () => {
  const root = await createTempDir();
  await writeFile(path.join(root, 'app.json'), '{}', 'utf8');

  try {
    const { buildAndPackage } = requireFresh('../lib/core/compiler.js');

    await assert.rejects(
      () =>
        buildAndPackage(
          makeProjectContext(root, '1.2.3'),
          { force: false, verbose: false, useNativeCompiler: false },
        ),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal(error instanceof CliError, true);
        assert.equal((error as Error).message.includes('TypeScript is required in the app project'), true);
        return true;
      },
    );
  } finally {
    await removeTempDir(root);
  }
});
