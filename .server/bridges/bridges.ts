import { ServerCommandBridge } from './command';
import { ServerEnvironmentalVariableBridge } from './environmental';
import { ServerSettingBridge } from './settings';

import {
    IEnvironmentalVariableBridge,
    IHttpBridge,
    IMessageBridge,
    IPersistenceBridge,
    IRocketletCommandBridge,
    IRoomBridge,
    IServerSettingBridge,
    IUserBridge,
    RocketletBridges,
} from 'temporary-rocketlets-server/server/bridges';

export class ServerRocketletBridges extends RocketletBridges {
    private readonly cmdBridge: ServerCommandBridge;
    private readonly setsBridge: ServerSettingBridge;
    private readonly envBridge: ServerEnvironmentalVariableBridge;

    constructor() {
        super();
        this.cmdBridge = new ServerCommandBridge();
        this.setsBridge = new ServerSettingBridge();
        this.envBridge = new ServerEnvironmentalVariableBridge();
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

    public getRoomBridge(): IRoomBridge {
        throw new Error('Method not implemented.');
    }

    public getUserBridge(): IUserBridge {
        throw new Error('Method not implemented.');
    }
}
