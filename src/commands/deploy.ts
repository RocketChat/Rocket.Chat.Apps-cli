import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';

import { FolderDetails } from '../misc';
import { checkReport, getServerInfo, packageAndZip, uploadApp  } from '../misc/deployHelpers';
import {IServerInfo1, IServerInfo2} from '../misc/interfaces';
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
        cli.action.start(`${ chalk.green('packaging') } your app`);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e, {exit: 2});
        }

        checkReport(this, fd, flags);
        let serverInfo: IServerInfo1 | IServerInfo2;
        try {
            serverInfo = await getServerInfo(fd);
        } catch (e) {
            this.log(e);
        }

        const zipName = await packageAndZip(this, fd);

        cli.action.stop('packaged!');

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        cli.action.start(`${ chalk.green('deploying') } your app`);

        await uploadApp({...flags, ...serverInfo}, fd, zipName);

        cli.action.stop('deployed!');
    }
}
