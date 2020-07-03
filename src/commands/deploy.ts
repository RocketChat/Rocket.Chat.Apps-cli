import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';

import { FolderDetails } from '../misc';
import { checkReport, getServerInfo, packageAndZip, uploadApp  } from '../misc/deployHelpers';
import { INormalLoginInfo, IPersonalAccessTokenLoginInfo } from '../misc/interfaces';

export default class Deploy extends Command {
    public static description = 'allows deploying an App to a server';

    public static flags = {
        help: flags.help({ char: 'h' }),
        // flag with no value (-f, --force)
        force: flags.boolean({ char: 'f', description: 'forcefully deploy the App, ignores lint & TypeScript errors' }),
        update: flags.boolean({ description: 'updates the app, instead of creating' }),
        code: flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        i2fa: flags.boolean({ description: 'interactively ask for 2FA code' }),
    };

    public async run() {
        const { flags } = this.parse(Deploy);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e, {exit: 2});
        }
        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }
        let serverInfo: INormalLoginInfo | IPersonalAccessTokenLoginInfo;
        let zipName;
        cli.log(chalk.bold.greenBright('   Starting App Deployment to Server\n'));

        try {
            cli.action.start(chalk.bold.greenBright('   Checking App Report'));
            checkReport(this, fd, flags);
            cli.action.stop(chalk.bold.greenBright('\u2713'));
        } catch (e) {
            cli.action.stop(chalk.red('\u2716'));
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }
        try {
            cli.action.start(chalk.bold.greenBright('   Getting Server Info'));
            serverInfo = await getServerInfo(fd);
            cli.action.stop(chalk.bold.greenBright('\u2713'));
        } catch (e) {
            cli.action.stop(chalk.red('\u2716'));
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }
        try {
            cli.action.start(chalk.bold.greenBright('   Packaging the app'));
            zipName = await packageAndZip(this, fd);
            cli.action.stop(chalk.bold.greenBright('\u2713'));
        } catch (e) {
            cli.action.stop(chalk.red('\u2716'));
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }
        try {
            cli.action.start(chalk.bold.greenBright('   Uploading App'));
            await uploadApp({...flags, ...serverInfo}, fd, zipName);
            cli.action.stop(chalk.bold.greenBright('\u2713'));
        } catch (e) {
            cli.action.stop(chalk.red('\u2716'));
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }
    }
}
