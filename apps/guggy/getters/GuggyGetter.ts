import { HttpStatusCode, IHttp } from '@rocket.chat/apps-ts-definition/accessors';

export class GuggyGetter {
    private readonly url: string = 'http://text2gif.guggy.com/guggify';

    public async getTheGif(http: IHttp, sentence: string): Promise<string> {
        const result = await http.post(this.url, {
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
