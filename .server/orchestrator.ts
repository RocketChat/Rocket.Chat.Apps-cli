import { AppManager } from '@rocket.chat/apps-engine/server/AppManager';
import { AppFabricationFulfillment } from '@rocket.chat/apps-engine/server/compiler';
import { ProxiedApp } from '@rocket.chat/apps-engine/server/ProxiedApp';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { AppStatusUtils } from '@rocket.chat/apps-ts-definition/AppStatus';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';
import * as AdmZip from 'adm-zip';
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

    private folder: string;

    constructor() {
        this.bridges = new ServerAppBridges();
        this.storage = new ServerAppStorage();
        this.logStorage = new ServerAppLogStorage();
        this.folder = 'dist';
        this.manager = new AppManager(this.storage, this.logStorage, this.bridges);
    }

    public async loadAndUpdate(): Promise<boolean> {
        const appsLoaded = await this.manager.load();

        console.log(`!!!! Manager has finished loading ${ appsLoaded.length } Apps !!!!`);

        const files = fs.readdirSync(this.folder)
                            .filter((file) => file.endsWith('.zip') && fs.statSync(path.join(this.folder, file)).isFile());

        for (const file of files) {
            const zipBase64 = fs.readFileSync(path.join(this.folder, file), 'base64');
            const zip = new AdmZip(new Buffer(zipBase64, 'base64'));
            const infoZip = zip.getEntry('app.json');
            let info: IAppInfo;

            if (infoZip && !infoZip.isDirectory) {
                try {
                    info = JSON.parse(infoZip.getData().toString()) as IAppInfo;
                } catch (e) {
                    throw new Error('Invalid App package. The "app.json" file is not valid json.');
                }
            }

            try {
                if (info && this.manager.getOneById(info.id)) {
                    console.log(`!!!! Updating the App ${ info.name } to v${ info.version } !!!!`);
                    this.handleAppFabFulfilled(await this.manager.update(zipBase64));
                } else {
                    console.log(`!!!! Installing the App ${ info.name } v${ info.version } !!!!`);
                    this.handleAppFabFulfilled(await this.manager.add(zipBase64));
                }
            } catch (e) {
                console.log('Got an error while working with:', file);
                console.error(e);
                throw e;
            }
        }

        this.manager.get().forEach((rl: ProxiedApp) => {
            if (AppStatusUtils.isEnabled(rl.getStatus())) {
                console.log(`Successfully loaded: ${ rl.getName() } v${ rl.getVersion() }`);
            } else if (AppStatusUtils.isDisabled(rl.getStatus())) {
                console.log(`Failed to load: ${ rl.getName() } v${ rl.getVersion() }`);
            } else {
                console.log(`Neither failed nor succeeded in loading: ${ rl.getName() } v${ rl.getVersion() }`);
            }
        });

        return true;
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

    private handleAppFabFulfilled(aff: AppFabricationFulfillment): void {
        if (aff.getCompilerErrors().length !== 0) {
            aff.getCompilerErrors().forEach((e) => console.error(e.message));
            console.log(`!!!! Failure due to ${ aff.getCompilerErrors().length } errors !!!!`);
        }
    }
}
