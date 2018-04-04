import { AppManager } from '@rocket.chat/apps-engine/server/AppManager';
import { App } from '@rocket.chat/apps-ts-definition/App';
import * as fs from 'fs';
import * as path from 'path';
import * as socketIO from 'socket.io';

import { ServerAppBridges } from './bridges/bridges';
import { ServerAppLogStorage } from './logStorage';
import { ServerAppStorage } from './storage';

export class Orchestrator {
    public bridges: ServerAppBridges;
    public storage: ServerAppStorage;
    public logStorage: ServerAppLogStorage;
    public manager: AppManager;

    private io: SocketIO.Server;

    constructor() {
        this.bridges = new ServerAppBridges();
        this.storage = new ServerAppStorage();
        this.logStorage = new ServerAppLogStorage();
        this.manager = new AppManager(this.storage, this.logStorage, this.bridges);
    }

    public loadAndUpdate(): Promise<boolean> {
        return this.manager.load().then(() => {
            return Promise.all(fs.readdirSync('dist')
                    .filter((file) => file.endsWith('.zip') && fs.statSync(path.join('dist', file)).isFile())
                    .map((file) => fs.readFileSync(path.join('dist', file), 'base64'))
                    .map((zip) => this.manager.add(zip).catch((err: Error) => {
                        if (err.message === 'App already exists.') {
                            return this.manager.update(zip);
                        } else {
                            console.log(err);
                            throw err;
                        }
                    })));
        }).then(() => {
            if (typeof this.io !== 'undefined') {
                this.io.emit('status', { loaded: this.manager.areAppsLoaded() });
                this.sendAppsInfo();
            }

            this.manager.get().forEach((rl) => console.log('Successfully loaded:', rl.getName()));
            return true;
        });
    }

    public setSocketServer(server: SocketIO.Server): void {
        this.io = server;

        this.io.on('connection', (socket) => {
            socket.emit('status', { loaded: this.manager.areAppsLoaded() });
            this.sendAppsInfo(socket);

            socket.on('get/enabled', (fn) => {
                fn(this.manager.get({ enabled: true }).map((rl) => rl.getInfo()));
            });

            socket.on('get/disabled', (fn) => {
                fn(this.manager.get({ disabled: true }).map((rl) => rl.getInfo()));
            });

            // TODO: language additions

            socket.on('get/commands', (fn) => {
                fn(this.bridges.getCommandBridge().getCommands());
            });
        });
    }

    private sendAppsInfo(socket?: SocketIO.Socket): void {
        const enabled = this.manager.get({ enabled: true }).map((rl) => rl.getInfo());
        const disabled = this.manager.get({ disabled: true }).map((rl) => rl.getInfo());

        if (socket) {
            socket.emit('apps', { enabled, disabled });
        } else {
            this.io.emit('apps', { enabled, disabled });
        }
    }
}
