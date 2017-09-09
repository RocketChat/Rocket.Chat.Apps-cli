import { IConfigurationExtend, ILogger } from 'temporary-rocketlets-ts-definition/accessors';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';
import { SettingType } from 'temporary-rocketlets-ts-definition/settings';

import { GuggyCommand } from './commands/GuggyCommand';
import { SettingToHttpHeader } from './handlers/SettingToHttpHeader';

export class GuggyRocketlet extends Rocketlet {
    private readonly apiKeySettingid: string;

    constructor(info: IRocketletInfo, logger: ILogger) {
        super(info, logger);
        this.apiKeySettingid = 'api-key';
    }

    protected extendConfiguration(configuration: IConfigurationExtend): void {
        configuration.settings.provideSetting({
            id: this.apiKeySettingid,
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Guggy_Api_Key',
        });

        configuration.http.provideDefaultHeader('Content-Type', 'application/json');
        configuration.http.providePreRequestHandler(new SettingToHttpHeader(this.apiKeySettingid));

        configuration.slashCommands.provideSlashCommand(new GuggyCommand());
    }
}
