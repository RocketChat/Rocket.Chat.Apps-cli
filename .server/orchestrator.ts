import * as fs from 'fs';
import * as path from 'path';
import * as socketIO from 'socket.io';
import { RocketletManager } from 'temporary-rocketlets-server/server/RocketletManager';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

import { ServerRocketletBridges } from './bridges/bridges';
import { ServerRocketletStorage } from './storage';

export class Orchestrator {
    public bridges: ServerRocketletBridges;
    public storage: ServerRocketletStorage;
    public manager: RocketletManager;

    private io: SocketIO.Server;

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
            if (typeof this.io !== 'undefined') {
                this.io.emit('status', { loaded: this.manager.areRocketletsLoaded() });
                this.sendRocketletsInfo();
            }

            this.manager.get().forEach((rl) => console.log('Successfully loaded:', rl.getName()));
            return true;
        });
    }

    public setSocketServer(server: SocketIO.Server): void {
        this.io = server;

        this.io.on('connection', (socket) => {
            socket.emit('status', { loaded: this.manager.areRocketletsLoaded() });
            this.sendRocketletsInfo(socket);

            socket.on('get/enabled', (fn) => {
                fn(this.manager.get({ enabled: true }).map((rl) => rl.getInfo()));
            });
        });
    }

    private sendRocketletsInfo(socket?: SocketIO.Socket): void {
        const enabled = this.manager.get({ enabled: true }).map((rl) => rl.getInfo());
        const disabled = this.manager.get({ disabled: true }).map((rl) => rl.getInfo());

        if (socket) {
            socket.emit('rocketlets', { enabled, disabled });
        } else {
            this.io.emit('rocketlets', { enabled, disabled });
        }
    }
}
