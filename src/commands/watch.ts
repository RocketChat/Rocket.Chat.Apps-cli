import { Command, flags } from '@oclif/command';
import * as chokidar from 'chokidar';
import cli from 'cli-ux';
import * as Listr from 'listr';

import { FolderDetails } from '../misc';
import { checkReport, getServerInfo, packageAndZip, uploadApp } from '../misc/deployHelpers';
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
            this.error(e && e.message ? e.message : e, {exit: 2});
        }

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        const watcher = chokidar.watch(fd.folder, {
            ignored: [
                '**/README.md',
                '**/package-lock.json',
                '**/package.json',
                '**/tslint.json',
                '**/tsconfig.json',
                '**/*.js',
                '**/*.js.map',
                '**/*.d.ts',
                '**/*.spec.ts',
                '**/*.test.ts',
                '**/dist/**',
                '**/.*',
            ],
            awaitWriteFinish: true,
            persistent: true,
        });
        if (flags.addfiles) {
            watcher.add(flags.addfiles);
        }
        if (flags.remfiles) {
            watcher.unwatch(flags.remfiles);
        }
        let serverInfo: INormalLoginInfo | IPersonalAccessTokenLoginInfo;
        const tasks = new Listr([
            {
                title: 'Checking report',
                task: (ctx, task) => {
                    ctx.checkReport = false;
                    try {
                        checkReport(this, fd, flags);
                        ctx.checkReport = true;
                        return;
                    } catch (e) {
                        throw new Error(e && e.message ? e.message : e);
                    }
                },
            },
            {
                title: 'Packaging',
                enabled: (ctx) => ctx.checkReport,
                task: async (ctx, task) => {
                    ctx.package = false;
                    try {
                        ctx.zipName = await packageAndZip(this, fd);
                        ctx.package = true;
                        return;
                    } catch (e) {
                        throw new Error(e && e.message ? e.message : e);
                    }
                },
            },
            {
                title: 'Reading server info',
                enabled: (ctx) => ctx.checkReport && ctx.package,
                task: async (ctx, task)  => {
                    ctx.serverInfo = false;
                    try {
                        serverInfo = await getServerInfo(fd);
                        ctx.serverInfo = true;
                    } catch (e) {
                        throw new Error(e && e.message ? e.message : e);
                    }
                },
            },
            {
                title: 'Adding App',
                enabled: (ctx) => ctx.checkReport && ctx.package && ctx.serverInfo,
                task: async (ctx, task) => {
                    ctx.exists = false;
                    try {
                        await uploadApp({...flags, ...serverInfo}, fd, ctx.zipName);
                    } catch (e) {
                        ctx.exists = true;
                        task.skip('App already exists trying to update');
                    }
                },
            },
            {
                title: 'Updating',
                enabled: (ctx) => ctx.checkReport && ctx.package && ctx.serverInfo && ctx.exists,
                task: async (ctx, task) => {
                    try {
                        await uploadApp({...flags, update: true, ...serverInfo}, fd, ctx.zipName);
                    } catch (e) {
                        throw new Error(e && e.message ? e.message : e);
                    }
                },
            },
        ]);
        watcher
            .on('change', async () => {
                tasks.run().catch((e) => {
                    return;
                });
                this.log('');
            })
            .on('ready', async () => {
                tasks.run().catch((e) => {
                    return;
                }) ;
                this.log('');
            });

}
}
