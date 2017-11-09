import {
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IRead,
} from 'temporary-rocketlets-ts-definition/accessors';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';
import { ISetting, SettingType } from 'temporary-rocketlets-ts-definition/settings';

import { GuggyCommand } from './commands/GuggyCommand';
import { GuggyGetter } from './getters/GuggyGetter';
import { SettingToHttpHeader } from './handlers/SettingToHttpHeader';

export class GuggyRocketlet extends Rocketlet {
    private readonly apiKeySettingid: string;
    private readonly guggyGetter: GuggyGetter;

    constructor(info: IRocketletInfo, logger: ILogger) {
        super(info, logger);
        this.apiKeySettingid = 'api-key';
        this.guggyGetter = new GuggyGetter();
    }

    public onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): boolean {
        if (!environmentRead.getSettings().getValueById(this.apiKeySettingid)) {
            configModify.slashCommands.disableSlashCommand('guggy');
        }

        return true;
    }

    // tslint:disable-next-line:max-line-length
    public onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): void {
        switch (setting.id) {
            case this.apiKeySettingid:
                this.handleApiKeySettingHandle(setting, configModify, http);
                break;
        }
    }

    protected extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): void {
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

    private handleApiKeySettingHandle(setting: ISetting, configModify: IConfigurationModify, http: IHttp): void {
        if (setting.value) {
            try {
                this.guggyGetter.getTheGif(http, 'testing');
                this.getLogger().log('Enabling the slash command.');
                configModify.slashCommands.enableSlashCommand('guggy');
            } catch (e) {
                // Not valid api key
                this.getLogger().log('Disabling the slash command because the api eky isnt valid.');
                configModify.slashCommands.disableSlashCommand('guggy');
            }
        } else {
            // There is no value, so remove the command
            this.getLogger().log('Disabling the slash command because there is no setting value defined.');
            configModify.slashCommands.disableSlashCommand('guggy');
        }
    }
}
