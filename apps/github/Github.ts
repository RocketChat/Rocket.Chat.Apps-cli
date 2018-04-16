import { IHttp, ILogger, IMessageBuilder, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IMessage, IPreMessageSentModify } from '@rocket.chat/apps-ts-definition/messages';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata/IAppInfo';

export class GithubApp extends App implements IPreMessageSentModify {
    private matcher: RegExp = /([a-zA-Z|_|\-|0-9]+)\/([a-zA-Z|_|\-|.|0-9]+)#(\d+)/g;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    // tslint:disable-next-line:max-line-length
    public async checkPreMessageSentModify(message: IMessage, read: IRead, http: IHttp): Promise<boolean> {
        if (typeof message.text !== 'string') {
            return false;
        }

        const result = message.text.match(this.matcher);

        return result ? result.length !== 0 : false;
    }

    // tslint:disable-next-line:max-line-length
    public async executePreMessageSentModify(message: IMessage, builder: IMessageBuilder, read: IRead, http: IHttp, persistence: IPersistence): Promise<IMessage> {
        if (typeof message.text !== 'string') {
            return message;
        }

        const githubLinks = message.text.match(this.matcher);

        if (githubLinks && githubLinks.length > 0) {
            for (const link of githubLinks) {
                const parts = this.matcher.exec(link);

                if (!parts || parts.length < 4) {
                    continue;
                }

                const newLink = `[${link}](https://github.com/${parts[1]}/${parts[2]}/issues/${parts[3]})`;

                message.text = message.text.replace(link, newLink);
            }
        }

        return message;
    }
}
