import { test } from '@oclif/test';
import { expect } from 'chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import { AppWatcher } from '../../src/misc/appWatcher';

describe('watch command', () => {
    test
        .stdout()
        .command(['watch'])
        .exit(2)
        .it('runs and fails without args');
});

describe('AppWatcher Integration (Logic Test)', function() {
    this.timeout(10000);

    const tempDir = path.join(__dirname, 'temp_app_watcher_test');
    let watcher: AppWatcher;
    let buildCallCount = 0;
    let configCallCount = 0;
    // Helper to allow hooking into build Call
    let onBuildCallback: () => void = () => { /* no-op */ };

    beforeEach(async () => {
        await fs.ensureDir(tempDir);
        // Create dummy config files
        await fs.writeFile(path.join(tempDir, 'app.json'), JSON.stringify({}));
        await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({}));
        await fs.writeFile(path.join(tempDir, 'tsconfig.json'), JSON.stringify({}));
        buildCallCount = 0;
        configCallCount = 0;
        onBuildCallback = () => { /* no-op */ };
    });

    afterEach(async () => {
        if (watcher) {
            await watcher.stop();
        }
        await fs.remove(tempDir);
    });

    const startWatcher = async () => {
        const fdMock = { folder: tempDir } as any;
        // Mock logger to suppress output during tests, or verify calls if needed
        const loggerMock = { log: () => { /* no-op */ }, error: () => { /* no-op */ } };

        // We want to wait for the INITIAL build to finish before we start our tests,
        // otherwise our counts will be off or we'll have race conditions.
        let initialBuildResolver: () => void;
        const initialBuildPromise = new Promise<void>((resolve) => { initialBuildResolver = resolve; });

        // Setup the watcher with a callback that resolves the promise on first call
        watcher = new AppWatcher(
            fdMock,
            [], // no ignores
            async () => {
                buildCallCount++;
                if (initialBuildResolver) {
                    initialBuildResolver();
                    initialBuildResolver = undefined; // prevent calling again
                }
            },
            () => { configCallCount++; },
            loggerMock,
        );

        await watcher.start();
        // Wait for the initial "scan complete" build
        await initialBuildPromise;

        // Reset counters so our tests only assert on NEW events
        buildCallCount = 0;
        configCallCount = 0;
    };

    it('should debounce rapid changes and trigger only one build', async () => {
        await startWatcher();

        // Rapidly write to the same file
        await fs.writeFile(path.join(tempDir, 'test1.ts'), 'content1');
        await new Promise((r) => setTimeout(r, 100));
        await fs.writeFile(path.join(tempDir, 'test1.ts'), 'content2');
        await new Promise((r) => setTimeout(r, 100));
        await fs.writeFile(path.join(tempDir, 'test1.ts'), 'content3');

        // Wait for debounce (1000ms) + stability (500ms) + buffer
        await new Promise((r) => setTimeout(r, 3000));

        expect(buildCallCount).to.equal(1, 'Expected exactly 1 build after rapid changes');
    });

    it('should detect app.json changes and trigger config reload', async () => {
        await startWatcher();

        await fs.writeFile(path.join(tempDir, 'app.json'), JSON.stringify({ version: '1.0.1' }));
        await new Promise((r) => setTimeout(r, 3000));

        expect(configCallCount).to.equal(1, 'Expected config reload callback to be fired');
        // It also triggers a build because the file changed
        expect(buildCallCount).to.equal(1, 'Expected build to be triggered on config change');
    });

    it('should detect package.json changes and trigger config reload', async () => {
        await startWatcher();

        await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ version: '1.0.1' }));

        await new Promise((r) => setTimeout(r, 3000));

        expect(configCallCount).to.equal(1, 'Expected config reload on package.json change');
        expect(buildCallCount).to.equal(1, 'Expected build to be triggered on package.json change');
    });

    it('should detect tsconfig.json changes and trigger config reload', async () => {
        await startWatcher();

        await fs.writeFile(path.join(tempDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'es6' } }));
        await new Promise((r) => setTimeout(r, 3000));
        expect(configCallCount).to.equal(1, 'Expected config reload on tsconfig.json change');
        expect(buildCallCount).to.equal(1, 'Expected build to be triggered on tsconfig.json change');
    });
});
