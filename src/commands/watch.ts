import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import cli from 'cli-ux';

import { AppCompiler, AppPackager, FolderDetails, VariousUtils } from '../misc';
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
        cli.log(`${ chalk.green('watching') } your app`);

        const { flags } = this.parse(Watch);

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

        const fd = new FolderDetails(this);
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
                try {
                return await Deploy.run([`--url=${flags.url}`, `-u=${flags.username}`,
                 `-p=${flags.password}`, '--update']);
                } catch {
                   return ;
                }
            })
            .on('ready', async () => {
                try {
                    return await Deploy.run([`--url=${flags.url}`, `-u=${flags.username}`,
                    `-p=${flags.password}`, '--update']);
                } catch {
                    return ;
                }
            });

}
}
