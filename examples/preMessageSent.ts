import { IMessage, IRoom, ISetting, IUser } from 'temporary-rocketlets-ts-definition';
import { BaseRocketlet } from 'temporary-rocketlets-ts-definition/base';

export class PreMessageSentRocketlet extends BaseRocketlet {
    constructor() {
        super('Pre Message Sent', 1, '0.0.1', 'Adds this Rocketlet\'s name to the end of each message.');
    }

    public pre_messageSent(room: IRoom, user: IUser, message: IMessage): IMessage {
        message.text = message.text + ' ' + this.getName();
        return message;
    }
}
