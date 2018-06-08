import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { IMessage } from '@rocket.chat/apps-ts-definition/messages';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-ts-definition/metadata';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

import { IOutOfOfficeStorage } from './IOutOfOfficeStorage';

export class OutOfOfficeCommand implements ISlashCommand {
    public command = 'out-of-office';
    public i18nParamsExample = 'outOfOfficeParamExample';
    public i18nDescription = 'outOfOfficeDescription';
    public providesPreview = false;

    // tslint:disable-next-line:max-line-length
    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        switch (context.getArguments().length) {
            case 0:
                return await this.invalidUsageHandler(context, modify);
            case 1:
                return await this.handleStatusArgOnly(context, read, modify, persis);
            default:
                return await this.handleWithCustomMessage(context, read, modify, persis);
        }
    }

    private async invalidUsageHandler(context: SlashCommandContext, modify: IModify): Promise<void> {
        await this.sendNotifyMessage(context, modify, 'Invalid usage of the Out of Office command. ' +
            'Please provide whether you are `out` or `in`, with the message optional if you are away.');
    }

    // tslint:disable-next-line:max-line-length
    private async handleStatusArgOnly(context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence): Promise<void> {
        const assoc = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, context.getSender().id);
        const data: IOutOfOfficeStorage = {
            out: true,
            // tslint:disable-next-line:max-line-length
            message: 'I am currently out of office and unable to respond to your message _(this is an automated response via a Rocket.Chat App)_.',
        };

        switch (context.getArguments()[0].toLowerCase()) {
            case 'in':
                await persis.removeByAssociation(assoc);
                // TODO: Maybe say something different if they weren't away to come back lol
                return await this.sendNotifyMessage(context, modify, `Welcome back, ${ context.getSender().username }!`);
            case 'out':
                await persis.createWithAssociation(data, assoc);
                return await this.sendNotifyMessage(context, modify,
                    'You are marked as *Out of Office*, we will see you when you get back.');
            case 'status':
                    const existing = await read.getPersistenceReader().readByAssociation(assoc);
                    if (existing.length > 0) {
                        return await this.sendNotifyMessage(context, modify, 'You are currently *out of office*.');
                    } else {
                        return await this.sendNotifyMessage(context, modify, 'You are currently *in office*.');
                    }
            default:
                return await this.sendNotifyMessage(context, modify,
                    'No idea what you are talking about. ' +
                    'Only `out`, `in` and `status` are accepted options for the first argument.');
        }
    }

    // tslint:disable-next-line:max-line-length
    private async handleWithCustomMessage(context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence): Promise<void> {
        const action = context.getArguments()[0].toLowerCase();

        if (action === 'in' || action === 'status') {
            return await this.handleStatusArgOnly(context, read, modify, persis);
        } else if (action !== 'out') {
            return await this.sendNotifyMessage(context, modify,
                'No idea what you are talking about. ' +
                'Only `out`, `in` and `status` are accepted options for the first argument.');
        }

        const args = Array.from(context.getArguments());
        args.splice(0, 1); // Removing the action
        const assoc = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, context.getSender().id);
        const data: IOutOfOfficeStorage = {
            out: true,
            message: args.join(' '),
        };

        // Allow setting their status again if they're currently marked as away
        const existing = await read.getPersistenceReader().readByAssociation(assoc);
        if (existing.length > 0) {
            await persis.removeByAssociation(assoc);
        }

        await persis.createWithAssociation(data, assoc);

        return await this.sendNotifyMessage(context, modify,
            'You are marked as *Out of Office*, we will see you when you get back. ' +
            'The message being sent to others when they contact you is: "' +
            data.message + '"');
    }

    private async sendNotifyMessage(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const msg = modify.getCreator().startMessage().setText(text)
            .setUsernameAlias('Out of Office').setEmojiAvatar(':calendar:')
            .setRoom(context.getRoom()).setSender(context.getSender()).getMessage();

        return await modify.getNotifer().notifyUser(context.getSender(), msg);
    }
}
