import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class TestingWithPermission implements ISlashCommand {
    public command: string;
    public paramsExample: string;
    public i18nDescription: string;
    public permission: string;

    constructor() {
        this.command = 'testing-with-permission';
        this.paramsExample = 'TestingApp_NoParams';
        this.i18nDescription = 'TestingApp_CmdWithPerm';
        this.permission = 'access-permissions';
    }

    // tslint:disable-next-line:max-line-length
    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): void {
        const msg = modify.getNotifer().getMessageBuilder()
            .setRoom(context.getRoom())
            .setUsernameAlias('Testing').setEmojiAvatar(':ghost:')
            .setText('You have permission, congrats.').getMessage();

        modify.getNotifer().notifyUser(context.getSender(), msg);
    }
}
