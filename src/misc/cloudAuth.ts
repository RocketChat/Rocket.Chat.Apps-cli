import { Request, Server } from '@hapi/hapi';
import axios from 'axios';
import chalk from 'chalk';
import { cli } from 'cli-ux';
import Conf = require('conf');
import { createHash } from 'crypto';
import open = require('open');
import { stringify } from 'querystring';
import { cpu, mem, osInfo, system } from 'systeminformation';
import { v4 as uuidv4 } from 'uuid';

const cloudUrl = 'https://cloud-beta.rocket.chat';
const clientId = '5d8e59c5d48080ef5497e522';
const scope = 'offline_access marketplace';

export interface ICloudToken {
    access_token: string;
    expires_in: number;
    scope: string;
    refresh_token: string;
    token_type: string;
}

export interface ICloudAuthStorage {
    token: ICloudToken;
    expiresAt: Date;
}

export class CloudAuth {
    private config: Conf;
    private codeVerifier: string;
    private port = 3005;
    private server: Server;
    private redirectUri: string;

    constructor() {
        this.redirectUri = `http://localhost:${ this.port }/callback`;
        this.codeVerifier = uuidv4() + uuidv4();
    }

    public async executeAuthFlow(): Promise<string> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            try {
                this.server = new Server({ host: 'localhost', port: this.port });
                this.server.route({
                    method: 'GET',
                    path: '/callback',
                    handler: async (request: Request) => {
                        try {
                            const code = request.query.code;
                            const token = await this.fetchToken(code);

                            resolve(token.access_token);
                            return 'Thank you. You can close this tab.';
                        } catch (err) {
                            reject(err);
                        } finally {
                            this.server.stop();
                        }
                    },
                });

                const codeChallenge = createHash('sha256').update(this.codeVerifier).digest('base64');
                const authorizeUrl = this.buildAuthorizeUrl(codeChallenge);
                cli.log(chalk.green('*') + ' ' + chalk.white('...if your browser does not open, open this:')
                    + ' ' + chalk.underline(chalk.blue(authorizeUrl)));

                open(authorizeUrl);

                this.server.start();
            } catch (e) {
                // tslint:disable-next-line:no-console
                console.log('Error inside of the execute:', e);
            }
        });
    }

    public async hasToken(): Promise<boolean> {
        await this.initialize();

        return this.config.has('rcc.token.access_token');
    }

    public async getToken(): Promise<string> {
        await this.initialize();

        const item: ICloudAuthStorage = this.config.get('rcc');
        if (new Date() < new Date(item.expiresAt)) {
            return item.token.access_token;
        }

        await this.refreshToken();

        return this.config.get('rcc.token.access_token', '') as string;
    }

    private async fetchToken(code: string | Array<string>): Promise<ICloudToken> {
        try {
            const request = {
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
                client_id: clientId,
                code,
                code_verifier: this.codeVerifier,
            };

            const res = await axios.post(`${ cloudUrl }/api/oauth/token`, stringify(request));
            const tokenInfo: ICloudToken = res.data;

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in);

            const storageItem: ICloudAuthStorage = {
                token: tokenInfo,
                expiresAt,
            };

            this.config.set('rcc', storageItem);

            return tokenInfo;
        } catch (err) {
            const d = err.response.data;
            // tslint:disable-next-line:no-console
            console.log(`[${ err.response.status }] error getting token: ${ d.error } (${ d.requestId })`);

            throw err;
        }
    }

    private async refreshToken(): Promise<void> {
        const refreshToken = this.config.get('rcc.token.refresh_token', '');

        const request = {
            client_id: clientId,
            refresh_token: refreshToken,
            scope,
            grant_type: 'refresh_token',
            redirect_uri: this.redirectUri,
        };

        try {
            const res = await axios.post(`${ cloudUrl }/api/oauth/token`, stringify(request));
            const tokenInfo: ICloudToken = res.data;

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in);

            this.config.set('rcc.token.access_token', tokenInfo.access_token);
            this.config.set('rcc.token.expires_in', tokenInfo.expires_in);
            this.config.set('rcc.token.scope', tokenInfo.scope);
            this.config.set('rcc.token.token_type', tokenInfo.token_type);
            this.config.set('rcc.expiresAt', expiresAt);
        } catch (err) {
            const d = err.response.data;
            // tslint:disable-next-line:no-console
            console.log(`[${ err.response.status }] error getting token refreshed: ${ d.error } (${ d.requestId })`);

            throw err;
        }
    }

    private buildAuthorizeUrl(codeChallenge: string) {
        const data = {
            client_id: clientId,
            response_type: 'code',
            scope,
            redirect_uri: this.redirectUri,
            state: uuidv4(),
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        };

        const params = stringify(data);
        const authorizeUrl = `${ cloudUrl }/authorize?${params}`;
        return authorizeUrl;
    }

    private async initialize(): Promise<void> {
        if (typeof this.config !== 'undefined') {
            return;
        }

        this.config = new Conf({
            projectName: 'chat.rocket.apps-cli',
            encryptionKey: await this.getEncryptionKey(),
        });
    }

    private async getEncryptionKey(): Promise<string> {
        const s = await system();
        const c = await cpu();
        const m = await mem();
        const o = await osInfo();

        return s.manufacturer + ';' + s.uuid + ';' + String(c.processors) + ';'
                + c.vendor + ';' + m.total + ';' + o.platform + ';' + o.release;
    }
}
