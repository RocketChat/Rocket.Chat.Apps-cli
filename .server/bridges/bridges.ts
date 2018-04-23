import { ServerAppActivationBridge } from './activation';
import { ServerCommandBridge } from './command';
import { ServerEnvironmentalVariableBridge } from './environmental';
import { ServerSettingBridge } from './settings';

import {
    AppBridges,
    IAppActivationBridge,
    IAppCommandBridge,
    IAppDetailChangesBridge,
    IEnvironmentalVariableBridge,
    IHttpBridge,
    IListenerBridge,
    IMessageBridge,
    IPersistenceBridge,
    IRoomBridge,
    IServerSettingBridge,
    IUserBridge,
} from '@rocket.chat/apps-engine/server/bridges';

export class ServerAppBridges extends AppBridges {
    private readonly cmdBridge: ServerCommandBridge;
    private readonly setsBridge: ServerSettingBridge;
    private readonly envBridge: ServerEnvironmentalVariableBridge;
    private readonly actsBridge: ServerAppActivationBridge;

    constructor() {
        super();
        this.cmdBridge = new ServerCommandBridge();
        this.setsBridge = new ServerSettingBridge();
        this.envBridge = new ServerEnvironmentalVariableBridge();
        this.actsBridge = new ServerAppActivationBridge();
    }

    public getCommandBridge(): ServerCommandBridge {
        return this.cmdBridge;
    }

    public getServerSettingBridge(): IServerSettingBridge {
        return this.setsBridge;
    }

    public getEnvironmentalVariableBridge(): IEnvironmentalVariableBridge {
        return this.envBridge;
    }

    public getHttpBridge(): IHttpBridge {
        throw new Error('Method not implemented.');
    }

    public getMessageBridge(): IMessageBridge {
        throw new Error('Method not implemented.');
    }

    public getPersistenceBridge(): IPersistenceBridge {
        throw new Error('Method not implemented.');
    }

    public getAppActivationBridge(): IAppActivationBridge {
        return this.actsBridge;
    }

    public getRoomBridge(): IRoomBridge {
        throw new Error('Method not implemented.');
    }

    public getUserBridge(): IUserBridge {
        throw new Error('Method not implemented.');
    }

    public getAppDetailChangesBridge(): IAppDetailChangesBridge {
        throw new Error('Method not implemented.');
    }

    public getListenerBridge(): IListenerBridge {
        throw new Error('Method not implemented.');
    }
}
