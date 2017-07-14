import { ServerCommandBridge } from './command';
import { ServerEnvironmentalVariableBridge } from './environmental';
import { ServerSettingBridge } from './settings';

import {
    IEnvironmentalVariableBridge,
    IRocketletCommandBridge,
    IServerSettingBridge,
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

    public getCommandBridge(): IRocketletCommandBridge {
        return this.cmdBridge;
    }

    public getServerSettingBridge(): IServerSettingBridge {
        return this.setsBridge;
    }

    public getEnvironmentalVariableBridge(): IEnvironmentalVariableBridge {
        return this.envBridge;
    }
}
