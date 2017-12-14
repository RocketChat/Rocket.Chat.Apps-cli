import { IHttp, IModify, IRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class GimmeCommand implements ISlashCommand {
    public static CommandName = 'gimme';

    public command: string = GimmeCommand.CommandName;
    public paramsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_Gimme_Description';

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): void {
        const builder = modify.getCreator().startMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText('༼ つ ◕_◕ ༽つ ' + context.getArguments().join(' '));

        modify.getCreator().finish(builder);
    }
}
