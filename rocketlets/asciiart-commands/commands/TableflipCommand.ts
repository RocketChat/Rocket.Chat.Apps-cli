import { IBuilder, IHttp, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, ISlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class TableflipCommand implements ISlashCommand {
    public command: string = 'tableflip';
    public paramsExample: string = 'your message (optional)';
    public i18nDescription: string = 'something_will_go_here';

    public executor(context: ISlashCommandContext, builder: IBuilder): void {
        const msgBuilder = builder.buildMessage()
            .setSender(context.getSender()).setRoom(context.getRoom())
            .setText(context.getArguments().join(' ') +
                (context.getArguments().length === 0 ? '' : ' ') +
                '(╯°□°）╯︵ ┻━┻');

        builder.finishMessage(msgBuilder);
    }
}
