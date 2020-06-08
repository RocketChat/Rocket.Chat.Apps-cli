import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import cli from 'cli-ux';
import * as Listr from 'listr';

import { FolderDetails } from '../misc';
import { DeployHelpers } from '../misc/deployHelpers';
import Deploy from './deploy';

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

        const { flags } = this.parse(Watch);
        const fd = new FolderDetails(this);
        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e);
            return;
        }

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
            persistent: true});
        if (flags.addfiles) {
            watcher.add(flags.addfiles);
        }
        if (flags.remfiles) {
            watcher.unwatch(flags.remfiles);
        }
        watcher
            .on('change', async () => {
                const dHelpers = new DeployHelpers();
                const tasks = new Listr([
                    {
                        title: 'Checking report',
                        task: () => {
                            dHelpers.checkReport(this, fd, flags);
                            return;
                        },
                    },
                    {
                        title: 'Packaging',
                        task: async (ctx, task) => {
                            ctx.zipName = dHelpers.packageAndZip(this, fd);
                            return;
                        },
                    },
                    {
                        title: 'Updating',
                        task: async (ctx, task) => {
                            try {
                                await dHelpers.uploadApp({...flags, update: true}, fd, ctx.zipName);
                            } catch (e) {
                                throw new Error(e.message);
                            }
                        },
                    },
                ]);
                tasks.run();
            })
            .on('ready', async () => {
                const dHelpers = new DeployHelpers();
                const tasks = new Listr([
                    {
                        title: 'Checking report',
                        task: () => {
                            dHelpers.checkReport(this, fd, flags);
                            return;
                        },
                    },
                    {
                        title: 'Packaging',
                        task: async (ctx, task) => {
                            ctx.zipName = await dHelpers.packageAndZip(this, fd);
                            return;
                        },
                    },
                    {
                        title: 'Adding App',
                        task: async (ctx, task) => {
                            try {
                                await dHelpers.uploadApp(flags, fd, ctx.zipName);
                            } catch (e) {
                                ctx.exists = true;
                                task.skip('App already exists trying to update');
                            }
                        },
                    },
                    {
                        title: 'Updating',
                        skip: (ctx) => ctx.exists === false,
                        task: async (ctx, task) => {
                            try {
                                await dHelpers.uploadApp({...flags, update: true}, fd, ctx.zipName);
                            } catch (e) {
                                throw new Error(e.message);
                            }
                        },
                    },
                ]);
                tasks.run().catch((e) => {
                    return;
                }) ;
            });

}
}
