import { Command } from '@oclif/command';
import * as fs from 'fs';
import * as path from 'path';
import { FolderDetails } from './folderDetails';

const TEMPLATES: Record<
    string,
    { file: string; content: (appName: string) => string }
> = {
    'slash-command': {
        file: 'SlashCommand.ts',
        content: (
            appName,
        ) => `import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ${appName} } from '../${appName}';

export class MyCommand implements ISlashCommand {
    public command = 'mycommand';
    public i18nParamsExample = 'MyCommand_Params';
    public i18nDescription = 'MyCommand_Description';
    public providesPreview = false;

    constructor(private readonly app: ${appName}) {}

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
    ): Promise<void> {
        const sender = context.getSender();
        const room = context.getRoom();
        const msg = modify.getCreator().startMessage()
            .setRoom(room)
            .setText(\`Hello, \${sender.name}!\`);
        await modify.getCreator().finish(msg);
    }
}
`,
    },
    'api-endpoint': {
        file: 'Endpoint.ts',
        content: (
            _appName,
        ) => `import { ApiEndpoint } from '@rocket.chat/apps-engine/definition/api';
import { IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';

export class MyEndpoint extends ApiEndpoint {
    public path = 'my-endpoint';

    public async get(request: IApiRequest, endpoint: IApiEndpointInfo): Promise<IApiResponse> {
        return this.success({ message: 'Hello!' });
    }

    public async post(request: IApiRequest, endpoint: IApiEndpointInfo): Promise<IApiResponse> {
        const { body } = request;
        if (!body?.data) {
            return this.notFound('Missing field: data');
        }
        return this.success({ received: body.data });
    }
}
`,
    },
    'settings': {
        file: 'Settings.ts',
        content: (
            _appName,
        ) => `import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    ApiToken = 'api_token',
    WelcomeMessage = 'welcome_message',
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.ApiToken,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: false,
        i18nLabel: 'ApiToken_Label',
        i18nDescription: 'ApiToken_Description',
    },
    {
        id: AppSetting.WelcomeMessage,
        type: SettingType.STRING,
        packageValue: 'Welcome!',
        required: false,
        public: true,
        i18nLabel: 'WelcomeMessage_Label',
        i18nDescription: 'WelcomeMessage_Description',
    },
];
`,
    },
};

export class BoilerplateCreator {
    constructor(
        private readonly fd: FolderDetails,
        private readonly command: Command,
    ) {}

    public async generate(templates: Array<string>): Promise<void> {
        const appClassName = this.fd.info.classFile.replace('.ts', '');
        for (const template of templates) {
            const tpl = TEMPLATES[template];
            if (!tpl) {
                this.command.warn(
                    `Unknown boilerplate: "${template}", skipping.`,
                );
                continue;
            }
            const destPath = path.join(this.fd.folder, tpl.file);
            fs.writeFileSync(destPath, tpl.content(appClassName), 'utf8');
            this.command.log(`  ✔ Generated ${tpl.file}`);
        }
    }
}
