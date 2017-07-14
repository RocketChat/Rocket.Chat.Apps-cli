import * as fs from 'fs';
import * as path from 'path';
import { RocketletManager } from 'temporary-rocketlets-server/server/RocketletManager';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

import { ServerRocketletBridges } from './bridges/bridges';
import { ServerRocketletStorage } from './storage';

export class Orchestrator {
    public bridges: ServerRocketletBridges;
    public storage: ServerRocketletStorage;
    public manager: RocketletManager;

    constructor() {
        this.bridges = new ServerRocketletBridges();
        this.storage = new ServerRocketletStorage();
        this.manager = new RocketletManager(this.storage, this.bridges);
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
