import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import cli from 'cli-ux';

import { FolderDetails } from '../misc';
import { checkReport, getIgnoredFiles, getServerInfo, packageAndZip, uploadApp } from '../misc/deployHelpers';
import { INormalLoginInfo, IPersonalAccessTokenLoginInfo } from '../misc/interfaces';

export default class Watch extends Command {

    public static description = 'watches for changes in the app and redeploys to the server';

    public static flags = {
        help: flags.help({ char: 'h' }),
        // flag with no value (-f, --force)
        addfiles: flags.string({
            char: 'a',
            description: 'add files to be watched during hot reload',
        }),
        remfiles: flags.string({
            char: 'r',
            description: 'remove files from watchlist during hot reload',
        }),
        force: flags.boolean({ char: 'f', description: 'forcefully deploy the App, ignores lint & TypeScript errors' }),
        code: flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        i2fa: flags.boolean({ description: 'interactively ask for 2FA code' }),
    };

    public async run() {

        const { flags } = this.parse(Watch);
        const fd = new FolderDetails(this);
        try {
            await fd.readInfoFile();
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

        const watcher = chokidar.watch(fd.folder, {
            ignored: ignoredFiles,
            awaitWriteFinish: true,
            persistent: true,
        });
        if (flags.addfiles) {
            watcher.add(flags.addfiles);
        }
        if (flags.remfiles) {
            watcher.unwatch(flags.remfiles);
        }

        watcher
            .on('change', async () => {
                tasks(this, fd, flags)
                .catch((e) => {
                    this.log(chalk.bold.redBright(`   \u27ff  ${e && e.message ? e.message : e}`));
                });
            })
            .on('ready', async () => {
                tasks(this, fd, flags)
                .catch((e) => {
                    this.log(chalk.bold.redBright(`   \u27ff  ${e && e.message ? e.message : e}`));
                });
            });
    }
}
const tasks = async (command: Command, fd: FolderDetails, flags: { [key: string]: any }): Promise<void> => {
    let serverInfo: INormalLoginInfo | IPersonalAccessTokenLoginInfo;
    let zipName;
    try {
        command.log('\n');
        cli.action.start(chalk.bold.greenBright('   Checking App Report'));
        checkReport(command, fd, flags);
        cli.action.stop(chalk.bold.greenBright('\u2713'));

        cli.action.start(chalk.bold.greenBright('   Packaging the app'));
        zipName = await packageAndZip(command, fd);
        cli.action.stop(chalk.bold.greenBright('\u2713'));

        cli.action.start(chalk.bold.greenBright('   Getting Server Info'));
        serverInfo = await getServerInfo(fd);
        cli.action.stop(chalk.bold.greenBright('\u2713'));

        try {
            cli.action.start(chalk.bold.greenBright('   Uploading App'));
            await uploadApp({...flags, ...serverInfo}, fd, zipName);
            cli.action.stop(chalk.bold.greenBright('\u2713'));
        } catch (e) {
            cli.action.stop(chalk.red('\u2716'));
            try {
                cli.action.start(chalk.bold.greenBright('   Installing App'));
                await uploadApp({...flags, ...serverInfo, update: true}, fd, zipName);
                cli.action.stop(chalk.bold.greenBright('\u2713'));
            } catch (e) {
                cli.action.stop(chalk.red('\u2716'));
                throw new Error(e);
            }
        }
    } catch (e) {
        cli.action.stop(chalk.red('\u2716'));
        throw new Error(e);
    }
};
