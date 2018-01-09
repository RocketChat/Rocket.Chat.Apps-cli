import {
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    ILogger,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';

export class TodoListApp extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    public initialize(configurationExtend: IConfigurationExtend): void {
        this.extendConfiguration(configurationExtend);
    }

    public onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): boolean {
        return true;
    }

    public onDisable(configurationModify: IConfigurationModify): void {
        return;
    }

    protected extendConfiguration(configuration: IConfigurationExtend): void {
        return;
    }
}
