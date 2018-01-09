import { IHttp, IModify, IRead, ISettingRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class UnflipCommand implements ISlashCommand {
    public static CommandName = 'unflip';

    public command: string = UnflipCommand.CommandName;
    public paramsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_TableUnflip_Description';

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): void {
        const msgBuilder = modify.getCreator().startMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText(context.getArguments().join(' ') +
                (context.getArguments().length === 0 ? '' : ' ') +
                '┬─┬ ノ( ゜-゜ノ)');

        modify.getCreator().finish(msgBuilder);
    }
}
