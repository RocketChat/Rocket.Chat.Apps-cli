import { IHttp, IMessageBuilder, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IMessage, IPostMessageSent, IPreMessageSentModify } from '@rocket.chat/apps-ts-definition/messages';
import { RoomType } from '@rocket.chat/apps-ts-definition/rooms';

export class OutOfOfficeApp extends App implements IPostMessageSent {
    public checkPostMessageSent(message: IMessage, read: IRead, http: IHttp): boolean {
        // We don't auto-respond to rooms beside direct messages
        // maybe in the future if the user is tagged by someone
        // then they will be direct messaged but right now it is
        // only direct messages
        this.getLogger().log(message.room.type, RoomType.DIRECT_MESSAGE);
        return message.room.type === RoomType.DIRECT_MESSAGE;
    }

    public executePostMessageSent(message: IMessage, read: IRead,
                                  http: IHttp, persistence: IPersistence): void {
        this.getLogger().log(message.room.type, message.sender.username, message.room.usernames);
    }
}
