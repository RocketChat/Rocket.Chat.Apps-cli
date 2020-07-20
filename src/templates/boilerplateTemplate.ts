import pascalCase = require('pascal-case');

export const apiEndpointTemplate = (endpointClassName: string, path: string): string => {
return `
import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';

export class ${pascalCase(endpointClassName)} extends ApiEndpoint {
    public path = '${path}';
    public example = [];

  public async get(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
                   http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }

  public async head(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
                    http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }

  public async options(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
                       http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }

  public async patch(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
                     http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }

  public post(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
              http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }

  public put(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify,
             http: IHttp, persis: IPersistence): Promise<IApiResponse> {
    throw new Error('Method not implemented');
  }
}
`;
};

export const slashCommandTemplate = (commandName: string): string => {
    return `
import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, ISlashCommandPreview,
        ISlashCommandPreviewItem, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

export class ${pascalCase(commandName)} implements ISlashCommand {
  public command = '';
  public i18nDescription = '';
  public i18nParamsExample = '';
  public permission = '';
  public providesPreview = false;

  public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext,
                                  read: IRead, modify: IModify,http: IHttp, persis: IPersistence): Promise<void> {
      throw new Error('Method not implemented');
    }

  public async executor(context: SlashCommandContext,read: IRead, modify: IModify,
                        http: IHttp, persis: IPersistence): Promise<void> {
      throw new Error('Method not implemented');
    }

  public async previewer(context: SlashCommandContext, read: IRead, modify: IModify,
                         http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
      throw new Error('Method not implemented');
    }
}
`;
};

export const initialSettingTemplate = (): string => {
    return `

    import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
    export const settings: Array<ISetting> = [

    ];
`;
};

export const appendNewSetting = (data: string): string => {
    const toWrite = `
    {
        id: '',
        type: SettingType.STRING,
        packageValue: '',
        required: false,
        public: false,
        i18nLabel: '',
        i18nDescription: '',
    },
`;
    const index = data.lastIndexOf('];');
    return data.slice(0, index) + toWrite + data.slice(index);
};
