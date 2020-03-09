import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as FormData from 'form-data';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

import { AppCompiler, AppPackager, FolderDetails } from '../misc';

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

        const compiler = new AppCompiler(this, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid && !flags.force) {
            this.error('TypeScript compiler error(s) occurred');
            this.exit(1);
            return;
        }

        const packager = new AppPackager(this, fd);
        const zipName = await packager.zipItUp();

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

        const data = new FormData();
        data.append('app', fs.createReadStream(fd.mergeWithFolder(zipName)));

        await this.asyncSubmitData(data, flags, fd);

        cli.action.stop('deployed!');
    }

    // tslint:disable:promise-function-async
    private async asyncSubmitData(data: FormData, flags: { [key: string]: any }, fd: FolderDetails): Promise<void> {
        let authResult;

        if (!flags.token) {
            let credentials: { username: string, password: string, code?: string };
            credentials = { username: flags.username, password: flags.password };
            if (flags.code) {
                credentials.code = flags.code;
            }

            authResult = await fetch(this.normalizeUrl(flags.url, '/api/v1/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            }).then((res: Response) => res.json());

            if (authResult.status === 'error' || !authResult.data) {
                throw new Error('Invalid username and password or missing 2FA code (if active)');
            }
        } else {
            const verificationResult = await fetch(this.normalizeUrl(flags.url, '/api/v1/me'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': flags.token,
                    'X-User-Id': flags.userid,
                },
            }).then((res: Response) => res.json());

            if (!verificationResult.success) {
                throw new Error('Invalid API token');
            }

            authResult = { data: { authToken: flags.token, userId: flags.userid } };
        }

        let endpoint = '/api/apps';
        if (flags.update) {
            endpoint += `/${fd.info.id}`;
        }

        const deployResult = await fetch(this.normalizeUrl(flags.url, endpoint), {
            method: 'POST',
            headers: {
                'X-Auth-Token': authResult.data.authToken,
                'X-User-Id': authResult.data.userId,
            },
            body: data,
        }).then((res: Response) => res.json());

        if (deployResult.status === 'error') {
            throw new Error(`Unknown error occurred while deploying ${JSON.stringify(deployResult)}`);
        } else if (!deployResult.success) {
            throw new Error(`Deployment error: ${ deployResult.error }`);
        }

        if (deployResult.compilerErrors && deployResult.compilerErrors.length > 0) {
            throw new Error(`Deployment compiler errors: \n${ JSON.stringify(deployResult.compilerErrors, null, 2) }`);
        }
    }

    // expects the `path` to start with the /
    private normalizeUrl(url: string, path: string): string {
        return url.replace(/\/$/, '') + path;
    }
}
