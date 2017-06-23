import { IConfigurationExtend, IEnvironmentRead } from 'temporary-rocketlets-ts-definition/accessors';
import { IHttp, IMessageExtend,
    IPersistence, IPersistenceRead, IRead } from 'temporary-rocketlets-ts-definition/accessors';
import { IRocketletAuthor } from 'temporary-rocketlets-ts-definition/IRocketletAuthor';
import { IMessage } from 'temporary-rocketlets-ts-definition/messages';
import { IPreMessageSentModify } from 'temporary-rocketlets-ts-definition/messages/IPreMessageSentModify';
import { IRocketChatAssociation } from 'temporary-rocketlets-ts-definition/metadata/IRocketChatAssociation';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class TestingRocketlet extends Rocketlet implements IPreMessageSentModify {
    private matcher: RegExp = /([a-zA-Z|_|\-|0-9]+)\/([a-zA-Z|_|\-|.|0-9]+)#(\d+)/g;

    constructor() {
        super('Testing', 1, '0.0.1', 'Testing description.', '0.2.2',
              { name: 'Bradley Hilton && Aaron Ogle', support: 'https://github.com/graywolf336' });
    }

    public checkPreMessageSentModify(message: IMessage,
                                     read: IRead, http: IHttp, persistence: IPersistenceRead): boolean {
        return message.text.match(this.matcher).length !== 0;
    }

    public executePreMessageSentModify(message: IMessage,
                                       read: IRead, http: IHttp, persistence: IPersistence): IMessage {

        const githubLinks = message.text.match(this.matcher);
        if (githubLinks.length > 0) {
            for (const link of githubLinks) {
                const parts = this.matcher.exec(link);

                const newLink = `[${link}](https://github.com/${parts[1]}${parts[2]}/issues/${parts[3]})`;

                message.text.replace(link, newLink);
            }
        }

        return message;
    }
}
