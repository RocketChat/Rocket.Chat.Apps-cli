import { IBuilder, IHttp, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, ISlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class UnflipCommand implements ISlashCommand {
    public command: string = 'unflip';
    public paramsExample: string = 'your message (optional)';
    public i18nDescription: string = 'something_will_go_here';

    public executor(context: ISlashCommandContext, builder: IBuilder): void {
        builder.buildMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText(context.getArguments().join(' ') + ' ┬─┬ ノ( ゜-゜ノ)').finish();
    }
}
