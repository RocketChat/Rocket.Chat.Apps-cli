import {
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IRead,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';
import { ISetting, SettingType } from '@rocket.chat/apps-ts-definition/settings';

import { GuggyCommand } from './commands/GuggyCommand';
import { GuggyGetter } from './getters/GuggyGetter';
import { SettingToHttpHeader } from './handlers/SettingToHttpHeader';

export class GuggyApp extends App {
    private readonly apiKeySettingid: string;
    private readonly guggyGetter: GuggyGetter;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
        this.apiKeySettingid = 'api-key';
        this.guggyGetter = new GuggyGetter();
    }

    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        const setting = await environmentRead.getSettings().getValueById(this.apiKeySettingid);
        if (!setting) {
            await configModify.slashCommands.disableSlashCommand('guggy');
        }

        return true;
    }

    // tslint:disable-next-line:max-line-length
    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        switch (setting.id) {
            case this.apiKeySettingid:
                await this.handleApiKeySettingHandle(setting, configModify, http);
                break;
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        configuration.settings.provideSetting({
            id: this.apiKeySettingid,
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Guggy_Api_Key',
            i18nDescription: 'Guggy_Api_Key_Description',
        });

        configuration.http.provideDefaultHeader('Content-Type', 'application/json');
        configuration.http.providePreRequestHandler(new SettingToHttpHeader(this.apiKeySettingid));

        configuration.slashCommands.provideSlashCommand(new GuggyCommand(this.guggyGetter));
    }

    private async handleApiKeySettingHandle(setting: ISetting, configModify: IConfigurationModify, http: IHttp): Promise<void> {
        if (setting.value) {
            try {
                this.guggyGetter.getTheGif(http, 'testing');
                this.getLogger().log('Enabling the slash command.');
                await configModify.slashCommands.enableSlashCommand('guggy');
            } catch (e) {
                // The api key is not valid
                this.getLogger().log('Disabling the slash command because the api key isnt valid.');
                await configModify.slashCommands.disableSlashCommand('guggy');
            }
        } else {
            // There is no value, so remove the command
            this.getLogger().log('Disabling the slash command because there is no setting value defined.');
            await configModify.slashCommands.disableSlashCommand('guggy');
        }
    }
}
