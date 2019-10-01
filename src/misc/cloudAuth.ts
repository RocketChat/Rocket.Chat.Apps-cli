import { Request, Server } from '@hapi/hapi';
import axios from 'axios';
import Conf = require('conf');
import { createHash } from 'crypto';
import open = require('open');
import { stringify } from 'querystring';
import { cpu, mem, osInfo, system } from 'systeminformation';
import { v4 as uuidv4 } from 'uuid';

const cloudUrl = 'https://cloud-beta.rocket.chat';

export interface ICloudAuthResult {
    token: string;
}

export class CloudAuth {
    private config: Conf;
    private codeVerifier: string;
    private server: Server;
    private redirectUri: string;

    constructor() {
        this.codeVerifier = uuidv4() + uuidv4();
    }

    public async executeAuthFlow(): Promise<ICloudAuthResult> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const port = 3005;
            try {
                this.redirectUri = `http://localhost:${ port }/callback`;

                this.server = new Server({ host: 'localhost', port });
                this.server.route({
                    method: 'GET',
                    path: '/callback',
                    handler: async (request: Request) => {
                        try {
                            const code = request.query.code;
                            const token = await this.fetchToken(code);

                            resolve({ token });
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

        return this.config.has('our.a.token');
    }

    public async getToken(): Promise<string> {
        await this.initialize();

        return this.config.get('our.a.token', '') as string;
    }

    private async fetchToken(code: string | Array<string>): Promise<string> {
        try {
            const request = {
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
                client_id: '5d8e59c5d48080ef5497e522',
                code,
                code_verifier: this.codeVerifier,
            };

            const url = `${ cloudUrl }/api/oauth/token`;
            const data = stringify(request);
            const res = await axios.post(url, data);

            this.config.set('our.a.token', res.data);

            return res.data;
        } catch (err) {
            // tslint:disable-next-line:no-console
            console.log('error getting token', err);

            throw err;
        }
    }

    private buildAuthorizeUrl(codeChallenge: string) {
        const data = {
            client_id: '5d8d40d44c43effadb77a351',
            response_type: 'code',
            scope: 'offline_access marketplace',
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
            projectName: 'Rocket.Chat_apps-cli',
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
