import chalk from 'chalk';
import * as chokidar from 'chokidar';
import * as crypto from 'crypto';
import * as fs from 'fs';
import pLimit from 'p-limit';
import * as path from 'path';

import { FolderDetails } from './folderDetails';
import { unicodeSymbols } from './unicodeSymbols';

export class AppWatcher {
    private fileHashes = new Map<string, string>();
    private limit = pLimit(50);
    private debounceTimer: NodeJS.Timeout;
    private isCompiling = false;
    private needsCompile = false;
    private watcher: chokidar.FSWatcher;

    constructor(
        private fd: FolderDetails,
        private ignoredFiles: Array<string>,
        private onBuild: () => Promise<void>,
        private onConfigChange: () => void,
        private logger: { log: (msg: string) => void, error: (msg: string) => void },
    ) {}

    public async stop(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
        }
    }

    public async start(): Promise<void> {
        const initialScanPromises: Array<Promise<any>> = [];
        let ready = false;

        const watcher = chokidar.watch(this.fd.folder, {
            ignored: this.ignoredFiles,
            awaitWriteFinish: {
                stabilityThreshold: 500,
            },
            persistent: true,
            interval: 300,
        });
        this.watcher = watcher;

        watcher
            .on('add', (eventPath) => {
                const promise = this.limit(() => this.updateFileHash(eventPath));
                if (!ready) {
                    initialScanPromises.push(promise);
                } else {
                    this.checkConfigChange(eventPath, 'add');
                    this.logger.log(chalk.bold.blue(`File added: ${path.relative(this.fd.folder, eventPath)}`));
                    this.debouncedCompile();
                }
            })
            .on('change', async (eventPath) => {
                const changed = await this.limit(() => this.updateFileHash(eventPath));
                if (!changed) {
                    // console.log(chalk.bold.yellow(`Content unchanged, skipping build for: ${eventPath}`));
                    return;
                }

                this.checkConfigChange(eventPath, 'change');
                this.logger.log(chalk.bold.blue(`Change detected in file: ${
                    path.relative(this.fd.folder, eventPath)
                }`));
                this.debouncedCompile();
            })
            .on('unlink', (eventPath) => {
                this.fileHashes.delete(eventPath);
                this.checkConfigChange(eventPath, 'unlink');
                this.logger.log(chalk.bold.blue(`File deleted: ${
                    path.relative(this.fd.folder, eventPath)
                }`));
                this.debouncedCompile();
            })
            .on('error', (error) => {
                this.logger.error(chalk.bold.red(`Watcher error: ${error}`));
            })
            .on('ready', async () => {
                await Promise.all(initialScanPromises);
                ready = true;
                this.triggerCompile();
            });
    }

    private async updateFileHash(eventPath: string): Promise<boolean> {
        try {
            const hash = await new Promise<string>((resolve, reject) => {
                const hash = crypto.createHash('sha1');
                const stream = fs.createReadStream(eventPath);
                stream.on('error', (err) => reject(err));
                stream.on('data', (chunk) => hash.update(chunk));
                stream.on('end', () => resolve(hash.digest('hex')));
            });

            if (this.fileHashes.get(eventPath) === hash) {
                return false;
            }

            this.fileHashes.set(eventPath, hash);
            return true;
        } catch (e) {
            // if (flags.verbose) {
            //     this.log(chalk.gray(`Could not hash file ${eventPath}: ${e.message}`));
            // }
             return false;
        }
    }

    private debouncedCompile() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.triggerCompile();
        }, 1000);
    }

    private async triggerCompile() {
        if (this.isCompiling) {
            this.needsCompile = true;
            return;
        }

        this.isCompiling = true;
        try {
            await this.onBuild();
        } catch (e) {
            this.logger.error(chalk.bold.red(e));
        } finally {
            this.isCompiling = false;
            if (this.needsCompile) {
                this.needsCompile = false;
                this.triggerCompile();
            } else {
                 this.logger.log(chalk.green('Waiting for changes...'));
            }
        }
    }

    private checkConfigChange(eventPath: string, type: 'add' | 'change' | 'unlink'): void {
        const relativePath = path.relative(this.fd.folder, eventPath);
        const isAppJson = relativePath === 'app.json';
        const isTsConfig = relativePath === 'tsconfig.json';
        const isPackage = relativePath === 'package.json';
        const isRcAppsConfig = relativePath === '.rcappsconfig';

        if (isAppJson || isTsConfig) {
            this.onConfigChange();
        }

        if (isRcAppsConfig && type !== 'unlink') {
            this.onConfigChange();
        }

        if (isPackage) {
            this.onConfigChange();
            if (type !== 'unlink') {
                this.logger.log(chalk.bold.yellow(
                    `\n${unicodeSymbols.get('warning')}  package.json ${
                        type === 'add' ? 'added' : 'changed'
                    }, you may need to run "npm install"`,
                ));
            }
        }
    }
}
