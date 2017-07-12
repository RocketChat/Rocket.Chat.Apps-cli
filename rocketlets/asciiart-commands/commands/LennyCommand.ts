import { IBuilder, IHttp, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, ISlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class LennyCommand implements ISlashCommand {
    public command: string = 'lennyface';
    public paramsExample: string = 'your message (optional)';
    public i18nDescription: string = 'something_will_go_here';

    public executor(context: ISlashCommandContext, builder: IBuilder): void {
        builder.finishMessage(builder.buildMessage({
            id: 'this-will-be-removed(whoops)',
            room: context.getRoom(),
            sender: context.getSender(),
            text: context.getArguments().join(' ') + (context.getArguments().length === 0 ? '' : ' ') + ' ( ͡° ͜ʖ ͡°)',
        }));
    }
}
