import { IHttp, IModify, IRead, ISettingRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class ShrugCommand implements ISlashCommand {
    public static CommandName = 'shrug';

    public command: string = ShrugCommand.CommandName;
    public i18nParamsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_Shrug_Description';
    public providesPreview: boolean = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const msgBuilder = modify.getCreator().startMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText(context.getArguments().join(' ') +
                (context.getArguments().length === 0 ? '' : ' ') +
                '¯\\_(ツ)_/¯');

        await modify.getCreator().finish(msgBuilder);
    }
}
