import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import cli from 'cli-ux';

import { ICompilerDiagnostic } from '@rocket.chat/apps-compiler/definition';
import { AppCompiler, FolderDetails, unicodeSymbols } from '../misc';
import { checkUpload, getIgnoredFiles, getServerInfo, uploadApp } from '../misc/deployHelpers';

export default class Watch extends Command {

    public static description = 'watches for changes in the app and redeploys to the server';

    public static flags = {
        help: flags.help({ char: 'h' }),
        url: flags.string({
            description: 'where the app should be deployed to',
        }),
        username: flags.string({
            char: 'u',
            description: 'username to authenticate with',
        }),
        password: flags.string({
            char: 'p',
            description: 'password for the user',
        }),
        token: flags.string({
            char: 't',
            description: 'API token to use with UserID (instead of username & password)',
        }),
        userId: flags.string({
            char: 'i',
            description: 'UserID to use with API token (instead of username & password)',
        }),
        verbose: flags.boolean({
            char: 'v',
            description: 'show additional details about the results of running the command',
        }),
        // flag with no value (-f, --force)
        force: flags.boolean({ char: 'f', description: 'forcefully deploy the App, ignores lint & TypeScript errors' }),
        code: flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        i2fa: flags.boolean({ description: 'interactively ask for 2FA code' }),
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

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        let ignoredFiles: Array<string>;
        try {
            ignoredFiles = await getIgnoredFiles(fd);
        } catch (e) {
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }

        chokidar.watch(fd.folder, {
            ignored: ignoredFiles,
            awaitWriteFinish: true,
            persistent: true,
            interval: 300,
        }).on('change', async () => {
            tasks(this, fd, flags)
            .catch((e) => {
                this.log(chalk.bold.redBright(
                    `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${e && e.message ? e.message : e}`));
            });
        }).on('ready', async () => {
            tasks(this, fd, flags)
            .catch((e) => {
                this.log(chalk.bold.redBright(
                    `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${e && e.message ? e.message : e}`));
            });
        });
    }
}

function reportDiagnostics(command: Command, diag: Array<ICompilerDiagnostic>): void {
    diag.forEach((d) => command.error(d.message));
}

const tasks = async (command: Command, fd: FolderDetails, flags: { [key: string]: any }): Promise<void> => {
    try {
        cli.action.start(chalk.bold.greenBright('   Packaging the app'));
        const compiler = new AppCompiler(fd);
        const result = await compiler.compile();

        if (flags.verbose) {
            command.log(`${chalk.green('[info]')} using TypeScript v${ result.typeScriptVersion }`);
        }

        if (result.diagnostics.length && !flags.force) {
            reportDiagnostics(command, result.diagnostics);
            command.error('TypeScript compiler error(s) occurred');
            command.exit(1);
            return;
        }

        const zipName = await compiler.outputZip();
        cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));

        cli.action.start(chalk.bold.greenBright('   Getting Server Info'));
        const serverInfo = await getServerInfo(fd, flags);
        cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));

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
    } catch (e) {
        cli.action.stop(chalk.red(unicodeSymbols.get('heavyMultiplicationX')));
        throw new Error(e);
    }
};
