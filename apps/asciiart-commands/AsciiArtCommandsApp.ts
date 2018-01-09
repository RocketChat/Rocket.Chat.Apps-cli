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

    public onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): boolean {
        const sets = environmentRead.getSettings();

        this.enableOrDisableCommand(this.gimmeId, sets.getValueById(this.gimmeId), configModify);
        this.enableOrDisableCommand(this.lennyId, sets.getValueById(this.lennyId), configModify);
        this.enableOrDisableCommand(this.shrugId, sets.getValueById(this.shrugId), configModify);
        this.enableOrDisableCommand(this.flipId, sets.getValueById(this.flipId), configModify);
        this.enableOrDisableCommand(this.unflipId, sets.getValueById(this.unflipId), configModify);

        return true;
    }

    public onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): void {
        this.enableOrDisableCommand(setting.id, setting.value as boolean, configModify);
    }

    protected extendConfiguration(configuration: IConfigurationExtend): void {
        configuration.settings.provideSetting({
            id: this.gimmeId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Gimme_Command',
            i18nDescription: 'Enable_Gimme_Command_Description',
        });

        configuration.settings.provideSetting({
            id: this.lennyId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Lenny_Command',
            i18nDescription: 'Enable_Lenny_Command_Description',
        });

        configuration.settings.provideSetting({
            id: this.shrugId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Shrug_Command',
            i18nDescription: 'Enable_Shrug_Command_Description',
        });

        configuration.settings.provideSetting({
            id: this.flipId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Tableflip_Command',
            i18nDescription: 'Enable_Tableflip_Command_Description',
        });

        configuration.settings.provideSetting({
            id: this.unflipId,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'Enable_Unflip_Table_Command',
            i18nDescription: 'Enable_Unflip_Table_Command_Description',
        });

        configuration.slashCommands.provideSlashCommand(new GimmeCommand());
        configuration.slashCommands.provideSlashCommand(new LennyCommand());
        configuration.slashCommands.provideSlashCommand(new ShrugCommand());
        configuration.slashCommands.provideSlashCommand(new TableflipCommand());
        configuration.slashCommands.provideSlashCommand(new UnflipCommand());
    }

    private enableOrDisableCommand(id: string, doEnable: boolean, configModify: IConfigurationModify): void {
        switch (id) {
            case this.gimmeId:
                if (doEnable) {
                    configModify.slashCommands.enableSlashCommand(GimmeCommand.CommandName);
                } else {
                    configModify.slashCommands.disableSlashCommand(GimmeCommand.CommandName);
                }
                return;
            case this.lennyId:
                if (doEnable) {
                    configModify.slashCommands.enableSlashCommand(LennyCommand.CommandName);
                } else {
                    configModify.slashCommands.disableSlashCommand(LennyCommand.CommandName);
                }
                return;
            case this.shrugId:
                if (doEnable) {
                    configModify.slashCommands.enableSlashCommand(ShrugCommand.CommandName);
                } else {
                    configModify.slashCommands.disableSlashCommand(ShrugCommand.CommandName);
                }
                return;
            case this.flipId:
                if (doEnable) {
                    configModify.slashCommands.enableSlashCommand(TableflipCommand.CommandName);
                } else {
                    configModify.slashCommands.disableSlashCommand(TableflipCommand.CommandName);
                }
                return;
            case this.unflipId:
                if (doEnable) {
                    configModify.slashCommands.enableSlashCommand(UnflipCommand.CommandName);
                } else {
                    configModify.slashCommands.disableSlashCommand(UnflipCommand.CommandName);
                }
                return;
        }
    }
}
