import { IHttp, IRead, ISettingRead } from 'temporary-rocketlets-ts-definition/accessors';
import { ISlashCommand } from 'temporary-rocketlets-ts-definition/slashcommands';

export class GimmeComand implements ISlashCommand {
    public command: string = 'gimme';
    public paramsExample: string = 'your message (optional)';
    public i18nDescription: string = 'something_will_go_here';

    public executor(args: Array<string>, settings: ISettingRead, read: IRead, http: IHttp): void {
        throw new Error('Method not implemented.');
    }
}
