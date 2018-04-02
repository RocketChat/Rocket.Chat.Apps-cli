// tslint:disable-next-line:max-line-length
import { IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IHttp, ILogger, IMessageBuilder, IMessageExtender, IPersistence, IRead } from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IMessage, IMessageAttachment, IPostMessageSent, IPreMessageSentExtend, IPreMessageSentModify, IPreMessageSentPrevent } from '@rocket.chat/apps-ts-definition/messages';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';
import { SettingType } from '@rocket.chat/apps-ts-definition/settings';

import { TestingNoPermission } from './commands/TestingNoPermission';
import { TestingWithPermission } from './commands/TestingWithPermission';

export class TestingApp extends App implements IPreMessageSentPrevent, IPreMessageSentExtend, IPreMessageSentModify, IPostMessageSent {
    private testingPrefix: string;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
        this.testingPrefix = '@testing:';
        this.getLogger().debug('TestingApp\'s constructor is called and I logged debug.');
    }

    public onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): boolean {
        this.testingPrefix = environment.getSettings().getValueById('testing-prefix') as string;

        return this.testingPrefix.length > 0;
    }

    // Test out IPreMessageSentPrevent
    public checkPreMessageSentPrevent(message: IMessage): boolean {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentPrevent
    public executePreMessageSentPrevent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): boolean {
        return message.text === `${ this.testingPrefix } Prevent this`;
    }

    // Test out IPreMessageSentExtend
    public checkPreMessageSentExtend(message: IMessage): boolean {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentExtend
    public executePreMessageSentExtend(message: IMessage, extend: IMessageExtender, read: IRead, http: IHttp, persistence: IPersistence): IMessage {
        const attach: IMessageAttachment = {
            text: `${ this.testingPrefix } Attachment`,
            color: '#00ff33',
            timestamp: new Date(1985, 6, 28, 12, 48, 30, 85),
        };

        return extend.addAttachment(attach).getMessage();
    }

    // Test out IPreMessageSentModify
    public checkPreMessageSentModify(message: IMessage): boolean {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentModify
    public executePreMessageSentModify(message: IMessage, builder: IMessageBuilder, read: IRead, http: IHttp, persistence: IPersistence): IMessage {
        const text = message.text;

        return builder.setText(text + '\n\n >' + text).getMessage();
    }

    // Test out IPostMessageSent
    public checkPostMessageSent(message: IMessage): boolean {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPostMessageSent
    public executePostMessageSent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): void {
        read.getNotifier().notifyUser(message.sender, message);
    }

    // Test out Commands
    protected extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead) {
        configuration.slashCommands.provideSlashCommand(new TestingNoPermission());
        configuration.slashCommands.provideSlashCommand(new TestingWithPermission());

        configuration.settings.provideSetting({
            id: 'testing-prefix',
            type: SettingType.STRING,
            packageValue: '@testing:',
            required: true,
            public: false,
            i18nLabel: 'TestingApp_TestingPrefix',
            i18nDescription: 'TestingApp_TestingPrefix_Description',
        });
    }
}
