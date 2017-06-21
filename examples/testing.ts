import { IMessageExtend } from 'temporary-rocketlets-ts-definition/accessors/IMessageExtend';
import { IMessageRead } from 'temporary-rocketlets-ts-definition/accessors/IMessageRead';
import { IRead } from 'temporary-rocketlets-ts-definition/accessors/IRead';
import { IMessage } from 'temporary-rocketlets-ts-definition/messages/IMessage';
import { IPostMessageSentHandler } from 'temporary-rocketlets-ts-definition/messages/IPostMessageSentHandler';
import { IPreMessageSentHandler } from 'temporary-rocketlets-ts-definition/messages/IPreMessageSentHandler';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';
import { IPreRoomCreateHandler } from 'temporary-rocketlets-ts-definition/rooms/IPreRoomCreateHandler';
import { IRoom } from 'temporary-rocketlets-ts-definition/rooms/IRoom';
import { IUser } from 'temporary-rocketlets-ts-definition/users/IUser';

export class TestingRocketlet extends Rocketlet
    implements IPreMessageSentHandler, IPostMessageSentHandler, IPreRoomCreateHandler {

    constructor() {
        super('Testing', 1, '0.0.1', 'Testing description.', '0.2.2');
    }

    public initialize(): void {
        throw new Error('Method not implemented.');
    }

    public onEnable(): boolean {
        throw new Error('Method not implemented.');
    }

    public onDisable(): void {
        throw new Error('Method not implemented.');
    }

    public isMessageApplicable(message: IMessage, read: IRead): boolean {
        throw new Error('Method not implemented.');
    }

    public extendMessage(message: IMessage, read: IMessageRead, extend: IMessageExtend): void {
        throw new Error('Method not implemented.');
    }

    public manipulateMessage(message: IMessage, read: IMessageRead): IMessage {
        throw new Error('Method not implemented.');
    }

    public postMessageSent(user: IUser, room: IRoom, message: IMessage): void {
        throw new Error('Method not implemented.');
    }

    public isRoomApplicable(message: IRoom, read: IRead): boolean {
        throw new Error('Method not implemented.');
    }

    public preRoomCreate(room: IRoom): IRoom {
        throw new Error('Method not implemented.');
    }
}
