import * as fs from 'fs';
import * as path from 'path';
import { RocketletManager } from 'temporary-rocketlets-server/manager';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

import { ServerRocketletStorage } from './storage';

export class Orchestrator {
    private storage: ServerRocketletStorage;
    private manager: RocketletManager;

    constructor() {
        this.storage = new ServerRocketletStorage();
        this.manager = new RocketletManager(this.storage);
    }

    public loadAndUpdate(): Promise<boolean> {
        return this.manager.load().then(() => {
            return Promise.all(fs.readdirSync('dist')
                    .filter((file) => file.endsWith('.zip') && fs.statSync(path.join('dist', file)).isFile())
                    .map((file) => fs.readFileSync(path.join('dist', file), 'base64'))
                    .map((zip) => this.manager.add(zip).catch((err: Error) => {
                        if (err.message === 'Rocketlet already exists.') {
                            return this.manager.update(zip);
                        } else {
                            console.log(err);
                            throw err;
                        }
                    })));
        }).then(() => {
            this.manager.get().forEach((rl) => console.log('Successfully loaded:', rl.getName()));
            return true;
        });
    }
}
