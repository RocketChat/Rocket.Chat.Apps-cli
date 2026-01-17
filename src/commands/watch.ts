import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as helper from 'fs-extra';

import { ICompilerDiagnostic } from '@rocket.chat/apps-compiler/definition';
import { AppCompiler, AppWatcher, FolderDetails, unicodeSymbols } from '../misc';
import { checkUpload, getIgnoredFiles, getServerInfo, retrieveSession, uploadApp } from '../misc/deployHelpers';

export default class Watch extends Command {

    public static description = 'watches for changes in the app and redeploys to the server';

    public static flags = {
        'help': flags.help({ char: 'h' }),
        'url': flags.string({
            description: 'where the app should be deployed to',
        }),
        'username': flags.string({
            char: 'u',
            description: 'username to authenticate with',
        }),
        'password': flags.string({
            char: 'p',
            description: 'password for the user',
        }),
        'token': flags.string({
            char: 't',
            description: 'API token to use with UserID (instead of username & password)',
        }),
        'userId': flags.string({
            char: 'i',
            description: 'UserID to use with API token (instead of username & password)',
        }),
        'verbose': flags.boolean({
            char: 'v',
            description: 'show additional details about the results of running the command',
        }),
        // flag with no value (-f, --force)
        'experimental-native-compiler': flags.boolean({
            description: '(experimental) use native TSC compiler',
        }),
        'force': flags.boolean({
            char: 'f',
            description: 'forcefully deploy the App, ignores lint & TypeScript errors',
        }),
        'code': flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        'i2fa': flags.boolean({ description: 'interactively ask for 2FA code' }),
    };

    public async run() {
        const { flags } = this.parse(Watch);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
            await fd.matchAppsEngineVersion();
        } catch (e) {
            this.error(chalk.bold.red(e && e.message ? e.message : e), {exit: 2});
        }

        let compiler = new AppCompiler(fd, flags['experimental-native-compiler']);

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        let ignoredFiles: Array<string>;
        try {
            ignoredFiles = await getIgnoredFiles(fd);
        } catch (e) {
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }

        let needsReload = false;
        const watcher = new AppWatcher(fd, ignoredFiles, async () => {
            if (needsReload) {
                try {
                    await fd.readInfoFile();
                    await fd.matchAppsEngineVersion();
                    compiler = new AppCompiler(fd, flags['experimental-native-compiler']);
                    cachedServerInfo = undefined;
                    this.log(chalk.bold.magenta('Configuration reloaded.'));
                    needsReload = false;
                } catch (e) {
                    this.log(chalk.bold.red(`Error reading app.json: ${e.message}`));
                    return;
                }   }
            await tasks(this, fd, flags, compiler);
        }, async () => {
            needsReload = true;
        }, {
            log: (msg) => this.log(msg),
            error: (msg) => this.log(msg),
        });

        process.on('SIGINT', async () => {
            await watcher.stop();
            process.exit();
        });

        await watcher.start();
    }
}

function reportDiagnostics(command: Command, diag: Array<ICompilerDiagnostic>): void {
    diag.forEach((d) => command.log(chalk.red(d.message)));
}

let cachedServerInfo: any;

const tasks = async (command: Command, fd: FolderDetails, flags: Record<string, any>, compiler: AppCompiler):
    Promise<void> => {
    try {
        process.stdout.write('\x1Bc');

        const start = Date.now();
        cli.action.start(chalk.bold.greenBright('   Packaging the app'));
        const result = await compiler.compile();

        if (flags.verbose) {
            command.log(`${chalk.green('[info]')} using TypeScript v${ result.typeScriptVersion }`);
        }

        if (result.diagnostics.length && !flags.force) {
            reportDiagnostics(command, result.diagnostics);
            throw new Error('TypeScript compiler error(s) occurred');
        }

        const zipName = await compiler.outputZip();
        cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));

        if (!cachedServerInfo) {
            cli.action.start(chalk.bold.greenBright('   Getting Server Info'));
            const info = await getServerInfo(fd, flags);
            const session = await retrieveSession(info);
            cachedServerInfo = { ...info, token: session.authToken, userId: session.userId };
            cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));
        } else {
             if (flags.verbose) {
                 command.log(`${chalk.green('[info]')} using cached server info`);
             }
        }

        try {
            await performAppUpload(command, fd, flags, cachedServerInfo, zipName);
        } catch (e) {
            const isAuthError = e.message.includes('Invalid API token') ||
                e.message.includes('Invalid username and password');
            if (isAuthError) {
                cli.action.stop(chalk.bold.yellow('Session expired'));
                cli.action.start(chalk.bold.greenBright('   Re-authenticating'));

                try {
                    const info = await getServerInfo(fd, flags);
                    const session = await retrieveSession(info);
                    cachedServerInfo = { ...info, token: session.authToken, userId: session.userId };

                    await performAppUpload(command, fd, flags, cachedServerInfo, zipName);
                    cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));
                } catch (retryError) {
                    throw retryError;
                }
            } else {
                throw e;
            }
        }

        await helper.remove(zipName);
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        command.log(chalk.gray(`   Finished in ${duration}s`));
    } catch (e) {
        cli.action.stop(chalk.red(unicodeSymbols.get('heavyMultiplicationX')));
        throw new Error(e);
    }
};

const performAppUpload = async (command: Command, fd: FolderDetails, flags: any, serverInfo: any, zipName: string) => {
    const status = await checkUpload({...flags, ...serverInfo}, fd);
    if (status) {
        cli.action.start(chalk.bold.greenBright('   Updating App'));
        await uploadApp({...serverInfo, update: true}, fd, zipName);
        cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));
    } else {
        cli.action.start(chalk.bold.greenBright('   Uploading App'));
        await uploadApp(serverInfo, fd, zipName);
        cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));
    }
};
