import { IHttp, IModify, IRead, ISettingRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class LennyCommand implements ISlashCommand {
    public static CommandName = 'lennyface';

    public command: string = LennyCommand.CommandName;
    public i18nParamsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_LennyFace_Description';
    public providesPreview: boolean = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        await modify.getCreator().finish(modify.getCreator().startMessage({
            id: 'this-will-be-removed(whoops)',
            room: context.getRoom(),
            sender: context.getSender(),
            text: context.getArguments().join(' ') + (context.getArguments().length === 0 ? '' : ' ') + ' ( ͡° ͜ʖ ͡°)',
        }));
    }
}
