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

    public async initialize(configurationExtend: IConfigurationExtend): Promise<void> {
        await this.extendConfiguration(configurationExtend);

        this.getLogger().log('Hello world from To Do App');
    }

    public onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): Promise<boolean> {
        return Promise.resolve(true);
    }

    public onDisable(configurationModify: IConfigurationModify): Promise<void> {
        return Promise.resolve();
    }

    protected extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        return Promise.resolve();
    }
}
