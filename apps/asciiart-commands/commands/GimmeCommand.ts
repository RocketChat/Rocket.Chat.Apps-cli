import { IHttp, IModify, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class GimmeCommand implements ISlashCommand {
    public static CommandName = 'gimme';

    public command: string = GimmeCommand.CommandName;
    public i18nParamsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_Gimme_Description';
    public providesPreview: boolean = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const builder = modify.getCreator().startMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText('༼ つ ◕_◕ ༽つ ' + context.getArguments().join(' '));

        await modify.getCreator().finish(builder);
    }
}
