import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';

import { FolderDetails } from '../misc';
import { DeployHelpers } from '../misc/deployHelpers';

export default class Deploy extends Command {
    public static description = 'allows deploying an App to a server';

    public static flags = {
        help: flags.help({ char: 'h' }),
        // flag with no value (-f, --force)
        force: flags.boolean({ char: 'f', description: 'forcefully deploy the App, ignores lint & TypeScript errors' }),
        update: flags.boolean({ description: 'updates the app, instead of creating' }),
        url: flags.string({ description: 'where the App should be deployed to' }),
        username: flags.string({ char: 'u', dependsOn: ['url'], description: 'username to authenticate with' }),
        password: flags.string({ char: 'p', dependsOn: ['username'], description: 'password of the user' }),
        code: flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        i2fa: flags.boolean({ description: 'interactively ask for 2FA code' }),
        token: flags.string({
            char: 't', dependsOn: ['userid'],
            description: 'API token to use with UserID (instead of username & password)',
        }),
        userid: flags.string({
            char: 'i', dependsOn: ['token'],
            description: 'UserID to use with API token (instead of username & password)',
        }),
    };

    public async run() {
        const { flags } = this.parse(Deploy);
        cli.action.start(`${ chalk.green('packaging') } your app`);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e);
            return;
        }
        const dHelpers = new DeployHelpers();
        dHelpers.checkReport(this, fd, flags);

        const zipName = await dHelpers.packageAndZip(this, fd);

        cli.action.stop('packaged!');

        if (!flags.url) {
            flags.url = await cli.prompt('What is the server\'s url (include https)?');
        }

        if (!flags.username && !flags.token) {
            flags.username = await cli.prompt('What is the username?');
        }

        if (!flags.password && !flags.token) {
            flags.password = await cli.prompt('And, what is the password?', { type: 'hide' });
        }

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        cli.action.start(`${ chalk.green('deploying') } your app`);

        dHelpers.uploadApp(flags, fd, zipName);

        cli.action.stop('deployed!');
    }
}
