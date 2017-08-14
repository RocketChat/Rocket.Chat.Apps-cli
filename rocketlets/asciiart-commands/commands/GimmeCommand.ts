import { IBuilder, IHttp, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class GimmeCommand implements ISlashCommand {
    public command: string = 'gimme';
    public paramsExample: string = 'your message (optional)';
    public i18nDescription: string = 'something_will_go_here';

    public executor(context: SlashCommandContext, builder: IBuilder): void {
        const msgBuilder = builder.buildMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText('༼ つ ◕_◕ ༽つ ' + context.getArguments().join(' '));

        builder.finishMessage(msgBuilder);
    }
}
