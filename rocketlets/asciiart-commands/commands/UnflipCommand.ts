import { IHttp, IModify, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class UnflipCommand implements ISlashCommand {
    public command: string = 'unflip';
    public paramsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_TableUnflip_Description';

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): void {
        const msgBuilder = modify.getCreater().startMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText(context.getArguments().join(' ') +
                (context.getArguments().length === 0 ? '' : ' ') +
                '┬─┬ ノ( ゜-゜ノ)');

        modify.getCreater().finish(msgBuilder);
    }
}
