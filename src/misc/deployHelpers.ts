import Command from '@oclif/command';
import * as FormData from 'form-data';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import { AppCompiler, AppPackager, FolderDetails } from '.';

export class DeployHelpers {
    public checkReport(command: Command, fd: FolderDetails, flags: { [key: string]: any }): void {
        const compiler = new AppCompiler(command, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid && !flags.force) {
            command.error('TypeScript compiler error(s) occurred');
            command.exit(1);
            return;
        }
    }

    public async packageAndZip(command: Command, fd: FolderDetails): Promise<string> {
        const packager = new AppPackager(command, fd);
        try {
            return await packager.zipItUp();
        } catch (e) {
            throw new Error(e);
        }
    }

    public async uploadApp(flags: { [key: string]: any }, fd: FolderDetails, zipname: string) {
        const data = new FormData();
        data.append('app', fs.createReadStream(fd.mergeWithFolder(zipname)));
        try {
        await this.asyncSubmitData(data, flags, fd);
        } catch (e) {
            throw new Error(e);
        }
    }

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
