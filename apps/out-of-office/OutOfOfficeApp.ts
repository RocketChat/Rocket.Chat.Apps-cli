import {
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    IMessageBuilder,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IMessage, IPostMessageSent, IPreMessageSentModify } from '@rocket.chat/apps-ts-definition/messages';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-ts-definition/metadata';
import { RoomType } from '@rocket.chat/apps-ts-definition/rooms';

import { IOutOfOfficeStorage } from './IOutOfOfficeStorage';
import { OutOfOfficeCommand} from './OutOfOfficeCommand';

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
        const otherUsers = message.room.usernames.filter((u) => u !== message.sender.username);
        if (otherUsers.length !== 1) {
            // We don't care if there isn't one other person in the room
            return;
        }

        const otherUser = read.getUserReader().getByUsername(otherUsers[0]);
        const assoc = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, otherUser.id);

        const awayDatas = read.getPersistenceReader().readByAssociation(assoc);
        if (awayDatas.length === 0) {
            // The user is not marked as away
            return;
        }

        const data = awayDatas[0] as IOutOfOfficeStorage;
        const msg = read.getNotifier().getMessageBuilder().setText(otherUser.username +
            ' is currently *out of office*, however they left the following message:\n\n>' +
            data.message)
            .setUsernameAlias('Out of Office').setEmojiAvatar(':calendar:')
            .setRoom(message.room).setSender(message.sender).getMessage();

        read.getNotifier().notifyUser(message.sender, msg);

        this.getLogger().log(otherUser.username +
            ' is currently *out of office*, however they left the following message:\n\n>"' + data.message + '"');
    }

    protected extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): void {
        configuration.slashCommands.provideSlashCommand(new OutOfOfficeCommand());
    }
}
