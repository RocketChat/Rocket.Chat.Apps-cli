import * as path from 'path';

import { AppsCompiler, ICompilerResult } from '@rocket.chat/apps-compiler';
import { FolderDetails } from './folderDetails';

import packageInfo = require('../../package.json');

// tslint:disable-next-line:no-var-requires
const createRequire = require('module').createRequire;

export function getTypescriptForApp(fd: FolderDetails): any {
    const appRequire = createRequire(fd.mergeWithFolder('app.json'));

    return appRequire('typescript');
}

export class AppCompiler {
    private compiler: AppsCompiler;

    constructor(private fd: FolderDetails) {
        this.compiler = new AppsCompiler({
            tool: packageInfo.name,
            version: packageInfo.version,
            when: new Date(),
        }, getTypescriptForApp(fd));
    }

    public async compile(): Promise<ICompilerResult> {
        return this.compiler.compile(this.fd.folder);
    }

    public async outputZip(): Promise<string> {
        const zipName = path.join('dist', `${this.fd.info.nameSlug}_${this.fd.info.version}.zip`);

        await this.compiler.outputZip(zipName);

        return zipName;
    }

}
