import { IHttp, IModify, IRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class GuggyCommand implements ISlashCommand {
    public command = 'guggy';
    public paramsExample = 'Guggy_Text_On_Image';
    public i18nDescription = 'Guggy_Command_Description';

    private readonly url: string = 'http://text2gif.guggy.com/guggify';

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): void {
        const result = http.post(this.url, {
            data: {
                format: 'gif',
                sentence: context.getArguments().join(' '),
            },
        });

        const builder = modify.getCreator().startMessage().setSender(context.getSender()).setRoom(context.getRoom());

        if (result.data && result.data.gif) {
            const gifUrl = result.data.gif as string;
            builder.addAttachment({ imageUrl: gifUrl });
        } else {
            builder.setText('Sorry I don\'t have a photo for you :disappointed_relieved:');
        }

        modify.getCreator().finish(builder);
    }
}
