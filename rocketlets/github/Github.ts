import { IHttp, ILogger, IPersistence, IPersistenceRead, IRead } from 'temporary-rocketlets-ts-definition/accessors';
import { IMessage, IPreMessageSentModify } from 'temporary-rocketlets-ts-definition/messages';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata/IRocketletInfo';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class GithubRocketlet extends Rocketlet implements IPreMessageSentModify {
    private matcher: RegExp = /([a-zA-Z|_|\-|0-9]+)\/([a-zA-Z|_|\-|.|0-9]+)#(\d+)/g;

    constructor(info: IRocketletInfo, logger: ILogger) {
        super(info, logger);
    }

    // tslint:disable-next-line:max-line-length
    public checkPreMessageSentModify(message: IMessage, read: IRead, http: IHttp, persistence: IPersistenceRead): boolean {
        return message.text.match(this.matcher).length !== 0;
    }

    // tslint:disable-next-line:max-line-length
    public executePreMessageSentModify(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): IMessage {
        const githubLinks = message.text.match(this.matcher);
        if (githubLinks.length > 0) {
            for (const link of githubLinks) {
                const parts = this.matcher.exec(link);

                const newLink = `[${link}](https://github.com/${parts[1]}/${parts[2]}/issues/${parts[3]})`;

                message.text = message.text.replace(link, newLink);
            }
        }

        return message;
    }
}
