import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class TestingNoPermission implements ISlashCommand {
    public command: string;
    public i18nParamsExample: string;
    public i18nDescription: string;
    public providesPreview: boolean;

    constructor() {
        this.command = 'testing-no-permission';
        this.i18nParamsExample = 'TestingApp_NoParams';
        this.i18nDescription = 'TestingApp_CmdNoPerm';
        this.providesPreview = false;
    }

    // tslint:disable-next-line:max-line-length
    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const msg = modify.getNotifer().getMessageBuilder()
            .setRoom(context.getRoom())
            .setUsernameAlias('Testing').setEmojiAvatar(':ghost:')
            .setText('You have successfully tested the command, good job.').getMessage();

        await modify.getNotifer().notifyUser(context.getSender(), msg);
    }
}
