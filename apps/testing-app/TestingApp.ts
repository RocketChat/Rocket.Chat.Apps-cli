import { IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IHttp, ILogger, IMessageBuilder, IMessageExtender, IPersistence, IRead, IRoomBuilder, IRoomExtender } from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IMessage, IMessageAttachment, IPostMessageSent, IPreMessageSentExtend, IPreMessageSentModify, IPreMessageSentPrevent } from '@rocket.chat/apps-ts-definition/messages';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';
import { IPostRoomCreate, IPreRoomCreateExtend, IPreRoomCreateModify, IPreRoomCreatePrevent, IRoom, RoomType } from '@rocket.chat/apps-ts-definition/rooms';
import { SettingType } from '@rocket.chat/apps-ts-definition/settings';

import { TestingNoPermission } from './commands/TestingNoPermission';
import { TestingWithPermission } from './commands/TestingWithPermission';
import { TestingSettingsEnum } from './TestingSettingsEnum';

export class TestingApp extends App implements IPreMessageSentPrevent, IPreMessageSentExtend, IPreMessageSentModify, IPostMessageSent, IPreRoomCreatePrevent, IPreRoomCreateExtend, IPreRoomCreateModify, IPostRoomCreate {
    private testingPrefix: string;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
        this.testingPrefix = 'testing-apps';
        this.getLogger().debug('TestingApp\'s constructor is called and I logged debug.');
    }

    public async onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): Promise<boolean> {
        this.testingPrefix = await environment.getSettings().getValueById(TestingSettingsEnum.TESTING_PREFIX) as string;

        return this.testingPrefix.length > 0;
    }

    // Test out IPreMessageSentPrevent
    public async checkPreMessageSentPrevent(message: IMessage): Promise<boolean> {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentPrevent
    public async executePreMessageSentPrevent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): Promise<boolean> {
        return message.text === `${ this.testingPrefix } prevent this`;
    }

    // Test out IPreMessageSentExtend
    public async checkPreMessageSentExtend(message: IMessage): Promise<boolean> {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentExtend
    public async executePreMessageSentExtend(message: IMessage,
                                             extend: IMessageExtender, read: IRead, http: IHttp, persistence: IPersistence): Promise<IMessage> {
        const attach: IMessageAttachment = {
            text: `${ this.testingPrefix } Attachment`,
            color: await read.getEnvironmentReader().getSettings().getValueById(TestingSettingsEnum.TESTING_A_COLOR),
            timestamp: new Date(1985, 6, 28, 12, 48, 30, 85),
        };

        return extend.addAttachment(attach).getMessage();
    }

    // Test out IPreMessageSentModify
    public async checkPreMessageSentModify(message: IMessage): Promise<boolean> {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreMessageSentModify
    public async executePreMessageSentModify(message: IMessage,
                                             builder: IMessageBuilder, read: IRead, http: IHttp, persistence: IPersistence): Promise<IMessage> {
        const text = message.text;

        return builder.setText(text + '\n\n> ' + text).getMessage();
    }

    // Test out IPostMessageSent
    public async checkPostMessageSent(message: IMessage): Promise<boolean> {
        return typeof message.text === 'string' ? message.text.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPostMessageSent
    public async executePostMessageSent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): Promise<void> {
        read.getNotifier().notifyUser(message.sender, message);
    }

    // Test out IPreRoomCreatePrevent
    public async checkPreRoomCreatePrevent(room: IRoom): Promise<boolean> {
        return room.type === RoomType.PRIVATE_GROUP ? room.slugifiedName.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreRoomCreatePrevent
    public async executePreRoomCreatePrevent(room: IRoom, read: IRead, http: IHttp, persistence: IPersistence): Promise<boolean> {
        return room.slugifiedName === `${ this.testingPrefix }-prevent`;
    }

    // Test out IPreRoomCreateExtend
    public async checkPreRoomCreateExtend(room: IRoom): Promise<boolean> {
        return room.type === RoomType.PRIVATE_GROUP ? room.slugifiedName.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreRoomCreateExtend
    public async executePreRoomCreateExtend(room: IRoom, extend: IRoomExtender, read: IRead, http: IHttp, persistence: IPersistence): Promise<IRoom> {
        const bot = await read.getUserReader().getById('rocket.cat');

        return extend.addMember(bot).getRoom();
    }

    // Test out IPreRoomCreateModify
    public async checkPreRoomCreateModify(room: IRoom): Promise<boolean> {
        return room.type === RoomType.PRIVATE_GROUP ? room.slugifiedName.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPreRoomCreateModify
    public async executePreRoomCreateModify(room: IRoom, builder: IRoomBuilder, read: IRead, http: IHttp, persistence: IPersistence): Promise<IRoom> {
        builder.setDisplayingOfSystemMessages(false);

        return builder.getRoom();
    }

    // Test out IPostRoomCreate
    public async checkPostRoomCreate(room: IRoom): Promise<boolean> {
        return room.type === RoomType.PRIVATE_GROUP ? room.slugifiedName.indexOf(this.testingPrefix) === 0 : false;
    }

    // Test out IPostRoomCreate
    public async executePostRoomCreate(room: IRoom, read: IRead, http: IHttp, persistence: IPersistence): Promise<void> {
        const msg = read.getNotifier().getMessageBuilder()
            .setRoom(room).setText(`Welcome to #${ room.slugifiedName }! _testing:_ :heavy_check_mark:`)
            .setEmojiAvatar(':ghost:').getMessage();

        await read.getNotifier().notifyRoom(room, msg);
    }

    // Test out various configuration extentions
    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new TestingNoPermission());
        await configuration.slashCommands.provideSlashCommand(new TestingWithPermission());

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_PREFIX,
            type: SettingType.STRING,
            packageValue: 'testing-apps',
            required: true,
            public: false,
            i18nLabel: 'TestingApp_TestingPrefix',
            i18nDescription: 'TestingApp_TestingPrefix_Description',
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_BOOLEAN,
            type: SettingType.BOOLEAN,
            packageValue: true,
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingBoolean',
            i18nDescription: 'TestingApp_TestingBoolean_Description',
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_COLOR,
            type: SettingType.COLOR,
            packageValue: '#00ff33',
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingColor',
            i18nDescription: 'TestingApp_TestingColor_Description',
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_NUMBER,
            type: SettingType.NUMBER,
            packageValue: 1337,
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingNumber',
            i18nDescription: 'TestingApp_TestingNumber_Description',
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_SELECT,
            type: SettingType.SELECT,
            packageValue: 'second',
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingSelect',
            i18nDescription: 'TestingApp_TestingSelect_Description',
            values: [
                {
                    key: 'first',
                    i18nLabel: 'TestingApp_FirstSelectOption',
                },
                {
                    key: 'second',
                    i18nLabel: 'TestingApp_SecondSelectOption',
                },
                {
                    key: 'third',
                    i18nLabel: 'TestingApp_ThirdSelectOption',
                },
                {
                    key: 'last',
                    i18nLabel: 'TestingApp_LastSelectOption',
                },
            ],
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_MULTI_LINE_STRING,
            type: SettingType.STRING,
            multiline: true,
            // tslint:disable-next-line:max-line-length
            packageValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\nNunc faucibus lacus erat, quis dapibus leo tempor eu. Maecenas vel tellus non ligula consectetur aliquet. Nam tempor iaculis lectus, in tincidunt lacus vehicula in. Nam eu tortor dapibus tellus condimentum faucibus a ac enim. Morbi euismod suscipit pellentesque. Etiam faucibus erat vitae neque fringilla, non elementum massa tincidunt. Cras pharetra, lorem eu facilisis dapibus, nibh magna scelerisque est, eu vulputate augue sapien sed metus. Duis volutpat tempus placerat. Donec in urna pulvinar, eleifend lacus at, porttitor velit. Morbi finibus molestie massa, quis aliquet ex euismod pellentesque. Proin semper imperdiet sapien sed ornare. Morbi fermentum metus sodales malesuada cursus. In nec massa eros.',
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingMultiString',
            i18nDescription: 'TestingApp_TestingMultiString_Description',
        });

        await configuration.settings.provideSetting({
            id: TestingSettingsEnum.TESTING_A_CODE,
            type: SettingType.CODE,
            packageValue: 'export class TestingSetting implements ISetting {\n  public id: \'something-cool\'\n}',
            required: false,
            public: false,
            i18nLabel: 'TestingApp_TestingCode',
            i18nDescription: 'TestingApp_TestingCode_Description',
        });
    }
}
