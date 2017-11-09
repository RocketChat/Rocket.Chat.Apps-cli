import { HttpStatusCode, IHttp } from 'temporary-rocketlets-ts-definition/accessors';

export class GuggyGetter {
    private readonly url: string = 'http://text2gif.guggy.com/guggify';

    public getTheGif(http: IHttp, sentence: string): string {
        const result = http.post(this.url, {
            data: {
                format: 'gif',
                sentence,
            },
        });

        if (result.statusCode === HttpStatusCode.OK && result.data && result.data.gif) {
            return result.data.gif as string;
        } else {
            throw new Error('No valid link found.');
        }
    }
}
