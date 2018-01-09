import { IAppActivationBridge } from '@rocket.chat/apps-engine/server/bridges';
import { ProxiedApp } from '@rocket.chat/apps-engine/server/ProxiedApp';

export class ServerAppActivationBridge implements IAppActivationBridge {
    public appEnabled(app: ProxiedApp): void {
        console.log(`The App ${ app.getName() } (${ app.getID() }) has been enabled.`);
    }

    public appDisabled(app: ProxiedApp): void {
        console.log(`The App ${ app.getName() } (${ app.getID() }) has been disabled.`);
    }

    public appLoaded(app: ProxiedApp, enabled: boolean): void {
        console.log(`The App ${ app.getName() } (${ app.getID() }) has been loaded.`);
    }

    public appUpdated(app: ProxiedApp, enabled: boolean): void {
        console.log(`The App ${ app.getName() } (${ app.getID() }) has been updated.`);
    }

    public appRemoved(app: ProxiedApp): void {
        console.log(`The App ${ app.getName() } (${ app.getID() }) has been removed.`);
    }
}
