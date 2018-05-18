import { IHttp, IModify, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';
import { GuggyGetter } from '../getters/GuggyGetter';

export class GuggyCommand implements ISlashCommand {
    public command = 'guggy';
    public i18nParamsExample = 'Guggy_Text_On_Image';
    public i18nDescription = 'Guggy_Command_Description';
    public providesPreview = false; // TODO: Convert this to true! :D

    constructor(private readonly getter: GuggyGetter) { }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const builder = modify.getCreator().startMessage().setSender(context.getSender()).setRoom(context.getRoom());

        try {
            const gifUrl = await this.getter.getTheGif(http, context.getArguments().join(' '));
            builder.addAttachment({ imageUrl: gifUrl });
        } catch (e) {
            builder.setText('Sorry I don\'t have a photo for you :disappointed_relieved:');
        }

        await modify.getCreator().finish(builder);
    }
}
