import { GimmeCommand } from './commands/GimmeCommand';
import { LennyCommand } from './commands/LennyCommand';
import { ShrugCommand } from './commands/ShrugCommand';
import { TableflipCommand } from './commands/TableflipCommand';
import { UnflipCommand } from './commands/UnflipCommand';

import {
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    IRead,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { ISetting, SettingType } from '@rocket.chat/apps-ts-definition/settings';

export class AsciiArtCommandsApp extends App {
    private gimmeId = 'gimmie_cmd';
    private lennyId = 'lenny_cmd';
    private shrugId = 'shrug_cmd';
    private flipId = 'flip_cmd';
    private unflipId = 'unflip_cmd';

    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        const sets = environmentRead.getSettings();

        await this.enableOrDisableCommand(this.gimmeId, await sets.getValueById(this.gimmeId), configModify);
        await this.enableOrDisableCommand(this.lennyId, await sets.getValueById(this.lennyId), configModify);
        await this.enableOrDisableCommand(this.shrugId, await sets.getValueById(this.shrugId), configModify);
        await this.enableOrDisableCommand(this.flipId, await sets.getValueById(this.flipId), configModify);
        await this.enableOrDisableCommand(this.unflipId, await sets.getValueById(this.unflipId), configModify);

        return true;
    }

    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        await this.enableOrDisableCommand(setting.id, setting.value as boolean, configModify);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.settings.provideSetting({
            id: this.gimmeId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Gimme_Command',
            i18nDescription: 'Enable_Gimme_Command_Description',
        });

        await configuration.settings.provideSetting({
            id: this.lennyId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Lenny_Command',
            i18nDescription: 'Enable_Lenny_Command_Description',
        });

        await configuration.settings.provideSetting({
            id: this.shrugId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Shrug_Command',
            i18nDescription: 'Enable_Shrug_Command_Description',
        });

        await configuration.settings.provideSetting({
            id: this.flipId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Tableflip_Command',
            i18nDescription: 'Enable_Tableflip_Command_Description',
        });

        await configuration.settings.provideSetting({
            id: this.unflipId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Unflip_Table_Command',
            i18nDescription: 'Enable_Unflip_Table_Command_Description',
        });

        await configuration.slashCommands.provideSlashCommand(new GimmeCommand());
        await configuration.slashCommands.provideSlashCommand(new LennyCommand());
        await configuration.slashCommands.provideSlashCommand(new ShrugCommand());
        await configuration.slashCommands.provideSlashCommand(new TableflipCommand());
        await configuration.slashCommands.provideSlashCommand(new UnflipCommand());
    }

    private async enableOrDisableCommand(id: string, doEnable: boolean, configModify: IConfigurationModify): Promise<void> {
        switch (id) {
            case this.gimmeId:
                if (doEnable) {
                    await configModify.slashCommands.enableSlashCommand(GimmeCommand.CommandName);
                } else {
                    await configModify.slashCommands.disableSlashCommand(GimmeCommand.CommandName);
                }
                return;
            case this.lennyId:
                if (doEnable) {
                    await configModify.slashCommands.enableSlashCommand(LennyCommand.CommandName);
                } else {
                    await configModify.slashCommands.disableSlashCommand(LennyCommand.CommandName);
                }
                return;
            case this.shrugId:
                if (doEnable) {
                    await configModify.slashCommands.enableSlashCommand(ShrugCommand.CommandName);
                } else {
                    await configModify.slashCommands.disableSlashCommand(ShrugCommand.CommandName);
                }
                return;
            case this.flipId:
                if (doEnable) {
                    await configModify.slashCommands.enableSlashCommand(TableflipCommand.CommandName);
                } else {
                    await configModify.slashCommands.disableSlashCommand(TableflipCommand.CommandName);
                }
                return;
            case this.unflipId:
                if (doEnable) {
                    await configModify.slashCommands.enableSlashCommand(UnflipCommand.CommandName);
                } else {
                    await configModify.slashCommands.disableSlashCommand(UnflipCommand.CommandName);
                }
                return;
        }
    }
}
