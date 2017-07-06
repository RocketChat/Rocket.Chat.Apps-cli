import { IConfigurationExtend, IEnvironmentRead, ILogger } from 'temporary-rocketlets-ts-definition/accessors';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class TodoListRocketlet extends Rocketlet {
    constructor(info: IRocketletInfo, logger: ILogger) {
        super(info, logger);
    }

    public initialize(configurationExtend: IConfigurationExtend): void {
        this.extendConfiguration(configurationExtend);
    }

    public onEnable(environment: IEnvironmentRead, configurationModify: object): boolean {
        return true;
    }

    public onDisable(configurationModify: object): void {
        return;
    }

    protected extendConfiguration(configuration: IConfigurationExtend): void {
        return;
    }
}
