import Command from '@oclif/command';
import * as FormData from 'form-data';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

import { AppCompiler, AppPackager, FolderDetails } from '.';
import { INormalLoginInfo, IPersonalAccessTokenLoginInfo } from './interfaces';

export const checkReport = (command: Command, fd: FolderDetails, flags: { [key: string]: any }): void => {
        const compiler = new AppCompiler(command, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid && !flags.force) {
            throw new Error('TypeScript compiler error(s) occurred');
        }
        return;
};

export const getServerInfo = async (fd: FolderDetails, flags: {[key: string]: any}):
    Promise<INormalLoginInfo | IPersonalAccessTokenLoginInfo | {}> => {
    if (!(await fd.doesFileExist(fd.mergeWithFolder('.rcappsconfig')))) {
        if (flags.url && ((flags.username && flags.password) ||  (flags.userId && flags.token))) {
            return {};
        } else if (!flags.url) {
            throw new Error('No url found, please add url either as flag or rcappsconfig variable');
        } else {
            if (flags.password || flags.username) {
                if (!flags.password) {
                    // tslint:disable-next-line:max-line-length
                    throw new Error('No password found with username, please add password either as flag or as rcappsconfig variable');
                } else {
                    // tslint:disable-next-line:max-line-length
                    throw new Error('No username found with password, please add username either as flag or as rcappsconfig variable');
                }
            } else if (flags.token || flags.userId) {
                if (!flags.token) {
                    // tslint:disable-next-line:max-line-length
                    throw new Error('No token found for userId, please add token either as flag or as rcapps config variable');
                } else {
                    // tslint:disable-next-line:max-line-length
                    throw new Error('No userId found for token, please add userId either as flag or as rcapps config variable');
                }
            } else {
                throw new Error('No username, password or userId, personal access token found for login');
            }
        }
    } else {
        try {
            const data = await fs.promises.readFile(fd.mergeWithFolder('.rcappsconfig'), 'utf-8');
            const {url, username, password} = JSON.parse(data);
            return {url, username, password};
        } catch (e) {
            throw new Error(e);
        }
    }
};

export const packageAndZip = async (command: Command, fd: FolderDetails): Promise<string> => {
        const packager = new AppPackager(command, fd);
        try {
            return  packager.zipItUp();
        } catch (e) {
            throw new Error(e);
        }
};

export const uploadApp = async (flags: { [key: string]: any }, fd: FolderDetails, zipname: string) => {
        const data = new FormData();
        data.append('app', fs.createReadStream(fd.mergeWithFolder(zipname)));
        try {
            await asyncSubmitData(data, flags, fd);
        } catch (e) {
            throw new Error(e);
        }
};

// tslint:disable-next-line:max-line-length
export const checkUpload = async (flags: { [key: string]: any }, fd: FolderDetails): Promise<boolean> => {
    let authResult;
    if (!flags.token) {
        let credentials: { username: string, password: string, code?: string };
        credentials = { username: flags.username, password: flags.password };
        if (flags.code) {
            credentials.code = flags.code;
        }

        authResult = await fetch(normalizeUrl(flags.url, '/api/v1/login'), {
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
        const verificationResult = await fetch(normalizeUrl(flags.url, '/api/v1/me'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': flags.token,
                'X-User-Id': flags.userId,
            },
        }).then((res: Response) => res.json());

        if (!verificationResult.success) {
            throw new Error('Invalid API token');
        }

        authResult = { data: { authToken: flags.token, userId: flags.userId } };
    }
    const endpoint = `/api/apps/${fd.info.id}`;

    const findApp = await fetch(normalizeUrl(flags.url, endpoint), {
        method: 'GET',
        headers: {
            'X-Auth-Token': authResult.data.authToken,
            'X-User-Id': authResult.data.userId,
        },
    }).then((res: Response) => res.json());
    return findApp.success;
};

export const asyncSubmitData = async (data: FormData, flags: { [key: string]: any },
                                      fd: FolderDetails): Promise<void> => {
        let authResult;

        if (!flags.token) {
            let credentials: { username: string, password: string, code?: string };
            credentials = { username: flags.username, password: flags.password };
            if (flags.code) {
                credentials.code = flags.code;
            }

            authResult = await fetch(normalizeUrl(flags.url, '/api/v1/login'), {
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
            const verificationResult = await fetch(normalizeUrl(flags.url, '/api/v1/me'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': flags.token,
                    'X-User-Id': flags.userId,
                },
            }).then((res: Response) => res.json());

            if (!verificationResult.success) {
                throw new Error('Invalid API token');
            }

            authResult = { data: { authToken: flags.token, userId: flags.userId } };
        }

        let endpoint = '/api/apps';
        if (flags.update) {
            endpoint += `/${fd.info.id}`;
        }

        const deployResult = await fetch(normalizeUrl(flags.url, endpoint), {
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
            if (deployResult.status === 'compiler_error') {
                throw new Error(`Deployment compiler errors: \n${ JSON.stringify(deployResult.messages, null, 2) }`);
            }
            throw new Error(`Deployment error: ${ deployResult.error }`);
        }
    };

    // expects the `path` to start with the /
export const normalizeUrl = (url: string, path: string): string => {
        return url.replace(/\/$/, '') + path;
};

export const getIgnoredFiles = async (fd: FolderDetails): Promise<Array<string>> => {
    try {
        const data = await fs.promises.readFile(fd.mergeWithFolder('.rcappsconfig'), 'utf-8');
        const parsedData =  JSON.parse(data);
        return parsedData.ignoredFiles;
    } catch (e) {
        throw new Error(e && e.message ? e.message : e);
    }
};
