import Command from '@oclif/command';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as Yazl from 'yazl';

import { FolderDetails } from './folderDetails';

export class AppPackager {
    public static GlobOptions: glob.IOptions = {
        dot: false,
        silent: true,
        ignore: [
            '**/README.md',
            '**/package-lock.json',
            '**/package.json',
            '**/tslint.json',
            '**/tsconfig.json',
            '**/*.js',
            '**/*.js.map',
            '**/*.d.ts',
            '**/dist/**',
            '**/.*',
        ],
    };

    public static PackagerInfo: { [key: string]: string } = {
        tool: '@rocket.chat/apps-cli',
        version: '1.4.0',
    };

    constructor(private command: Command, private fd: FolderDetails) {}

    public async zipItUp(): Promise<string> {
        let matches;

        try {
            matches = await this.asyncGlob();
        } catch (e) {
            this.command.warn(`Failed to retrieve the list of files for the App ${ this.fd.info.name }.`);
            throw e;
        }

        // Ensure we have some files to package up before we do the packaging
        if (matches.length === 0) {
            throw new Error('No files to package were found');
        }

        const zipName = path.join('dist',`${this.fd.info.nameSlug}_${this.fd.info.version}.zip`);
        const zip = new Yazl.ZipFile();

        zip.addBuffer(Buffer.from(JSON.stringify(AppPackager.PackagerInfo)), '.packagedby', { compress: true });

        for (const realPath of matches) {
            const zipPath = path.relative(this.fd.folder + path.sep,realPath)
            const fileStat = await fs.stat(realPath);

            const options: Partial<Yazl.Options> = {
                compress: true,
                mtime: fileStat.mtime,
                mode: fileStat.mode,
            };

            zip.addFile(realPath, zipPath, options);
        }

        zip.end();

        await this.asyncWriteZip(zip, zipName);

        return zipName;
    }

    // tslint:disable-next-line:promise-function-async
    private asyncGlob(): Promise<Array<string>> {
        return new Promise((resolve, reject) => {
            glob(this.fd.toZip, AppPackager.GlobOptions, (err, matches) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(matches);
            });
        });
    }

    // tslint:disable-next-line:promise-function-async
    private asyncWriteZip(zip: Yazl.ZipFile, zipName: string): Promise<void> {
        return new Promise((resolve) => {
            fs.mkdirpSync(this.fd.mergeWithFolder('dist'));
            const realPath = this.fd.mergeWithFolder(zipName);
            zip.outputStream.pipe(fs.createWriteStream(realPath)).on('close', resolve);
        });
    }
}
