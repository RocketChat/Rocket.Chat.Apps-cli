import { IHttp, IModify, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class LennyCommand implements ISlashCommand {
    public command: string = 'lennyface';
    public paramsExample: string = 'your_message_optional';
    public i18nDescription: string = 'Slash_LennyFace_Description';

    public executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): void {
        modify.getCreater().finish(modify.getCreater().startMessage({
            id: 'this-will-be-removed(whoops)',
            room: context.getRoom(),
            sender: context.getSender(),
            text: context.getArguments().join(' ') + (context.getArguments().length === 0 ? '' : ' ') + ' ( ͡° ͜ʖ ͡°)',
        }));
    }
}
