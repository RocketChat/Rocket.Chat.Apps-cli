import {
    IConfigurationExtend,
    IEnvironmentRead,
    ILogger,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';

import { GiphyCommand } from './commands/GiphyCommand';
import { GifGetter } from './helpers/GifGetter';

export class GiphyApp extends App {
    private gifGetter: GifGetter;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);

        this.gifGetter = new GifGetter();
    }

    public getGifGetter(): GifGetter {
        return this.gifGetter;
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new GiphyCommand(this));
    }
}
