import { IConfigurationExtend, IEnvironmentRead } from 'temporary-rocketlets-ts-definition/accessors';
import {
    IHttp,
    IMessageExtend,
    IPersistence,
    IPersistenceRead,
    IRead,
} from 'temporary-rocketlets-ts-definition/accessors';
import { IMessage } from 'temporary-rocketlets-ts-definition/messages';
import { IPreMessageSentExtend } from 'temporary-rocketlets-ts-definition/messages/IPreMessageSentExtend';
import { IRocketChatAssociation } from 'temporary-rocketlets-ts-definition/metadata/IRocketChatAssociation';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class TestingRocketlet extends Rocketlet implements IPreMessageSentExtend {
    constructor() {
        super('Testing', 1, '0.0.1', 'Testing description.', '0.2.2');
    }

    public getRocketChatAssociation(): IRocketChatAssociation {
        throw new Error('Method not implemented.');
    }

    public onEnable(environment: IEnvironmentRead, configurationModify: object): boolean {
        throw new Error('Method not implemented.');
    }

    public onDisable(configurationModify: object): void {
        throw new Error('Method not implemented.');
    }

    public checkPreMessageSentExtend(message: IMessage,
                                     read: IRead,
                                     http: IHttp,
                                     persistence: IPersistenceRead): boolean {
        throw new Error('Method not implemented.');
    }
    public executePreMessageSentExtend(message: IMessage,
                                       read: IRead,
                                       extend: IMessageExtend,
                                       http: IHttp,
                                       persistence: IPersistence): IMessage {
        throw new Error('Method not implemented.');
    }

    protected extendConfiguration(configuration: IConfigurationExtend): void {
        throw new Error('Method not implemented.');
    }
}
