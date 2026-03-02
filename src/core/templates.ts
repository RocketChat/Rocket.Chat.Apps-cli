import { AppManifest } from './types';

export function appClassTemplate(className: string): string {
  return `import {
  IAppAccessors,
  ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';

export class ${className} extends App {
  constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
    super(info, logger, accessors);
  }
}
`;
}

export function appReadmeTemplate(manifest: AppManifest): string {
  return `# ${manifest.name}

${manifest.description}

## Development

1. Install dependencies with \`npm install\`
2. Build your app with \`npm run build\`
3. Package with \`rc-apps package\`
4. Deploy with \`rc-apps deploy --url http://localhost:3000 --username <user> --password <pass>\`
`;
}

export function appTsConfigTemplate(): string {
  return `{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
`;
}

export function appPackageJsonTemplate(appName: string, appsEngineVersion: string): string {
  return `{
  "name": "${appName}",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "@rocket.chat/apps-engine": "${appsEngineVersion}",
    "@types/node": "^20.17.0",
    "typescript": "^5.7.2"
  }
}
`;
}

export function endpointTemplate(className: string, endpointPath: string): string {
  return `import {
  ApiSecurity,
  ApiVisibility,
} from '@rocket.chat/apps-engine/definition/api';
import {
  IApiEndpoint,
  IApiRequest,
  IApiResponse,
} from '@rocket.chat/apps-engine/definition/api/IApiEndpoint';

export class ${className} implements IApiEndpoint {
  public path = '${endpointPath}';
  public security = ApiSecurity.UNSECURE;
  public visibility = ApiVisibility.PUBLIC;

  public async get(_request: IApiRequest): Promise<IApiResponse> {
    return {
      status: 200,
      content: { ok: true },
    };
  }
}
`;
}

export function slashCommandTemplate(className: string): string {
  return `import {
  IHttp,
  IModify,
  IPersistence,
  IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
  ISlashCommand,
  SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';

export class ${className} implements ISlashCommand {
  public command = '${className.toLowerCase()}';
  public i18nDescription = 'Runs ${className}';
  public i18nParamsExample = '';
  public providesPreview = false;

  public async executor(
    _context: SlashCommandContext,
    _read: IRead,
    _modify: IModify,
    _http: IHttp,
    _persis: IPersistence,
  ): Promise<void> {
    return;
  }
}
`;
}

export function initialSettingsTemplate(): string {
  return `import {
  ISetting,
  SettingType,
} from '@rocket.chat/apps-engine/definition/settings';

export const settings: ISetting[] = [];
`;
}

export function appendSettingTemplate(settingsSource: string, settingId: string): string {
  const addition = `settings.push({
  id: '${settingId}',
  public: false,
  type: SettingType.STRING,
  packageValue: '',
  required: false,
  i18nLabel: '${settingId}_label',
  i18nDescription: '${settingId}_description',
});\n`;

  if (!settingsSource.includes('settings.push')) {
    return `${settingsSource.trimEnd()}\n\n${addition}`;
  }

  return `${settingsSource.trimEnd()}\n${addition}`;
}
