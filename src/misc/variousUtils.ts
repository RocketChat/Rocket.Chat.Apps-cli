import * as fs from 'fs';

export class VariousUtils {
    public static slugify = function _slugify(text: string): string {
        return text.toString().toLowerCase().replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w-]+/g, '')       // Remove all non-word chars
            .replace(/--+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of textte
    };

    public static getTsDefVersion = function _getTsDefVersion(): string {
        const devLocation = 'node_modules/@rocket.chat/apps-ts-definition/package.json';

        if (fs.existsSync(devLocation)) {
            const info = JSON.parse(fs.readFileSync(devLocation, 'utf8'));
            return '^' + info.version as string;
        }

        return '^0.9.13';
    };
}
