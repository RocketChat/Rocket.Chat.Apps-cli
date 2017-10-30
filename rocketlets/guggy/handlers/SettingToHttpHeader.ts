import {
    IHttpPreRequestHandler,
    IHttpRequest,
    IPersistence,
    IRead,
} from 'temporary-rocketlets-ts-definition/accessors';

export class SettingToHttpHeader implements IHttpPreRequestHandler {
    private readonly apiHeaderKey: string;

    constructor(private readonly apiKeyId: string) {
        this.apiHeaderKey = 'apiKey';
    }

    // tslint:disable-next-line:max-line-length
    public executePreHttpRequest(url: string, request: IHttpRequest, read: IRead, persistence: IPersistence): IHttpRequest {
        const apiKey = read.getEnvironmentReader().getSettings().getValueById(this.apiKeyId);

        if (typeof apiKey !== 'string' || apiKey.length === 0) {
            throw new Error('Invalid Guggy Api Key!');
        }

        if (typeof request.headers === 'undefined') {
            request.headers = { };
        }

        request.headers[this.apiHeaderKey] = apiKey;

        return request;
    }
}
