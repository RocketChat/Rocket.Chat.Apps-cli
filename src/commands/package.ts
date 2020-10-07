import { Command, flags } from '@oclif/command';
import { AppsCompiler, ICompilerDiagnostic } from '@rocket.chat/apps-compiler';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as TS from 'typescript';

import * as path from 'path';

import { FolderDetails } from '../misc';

import packageInfo = require('../../package.json');

// tslint:disable-next-line:no-var-requires
const createRequire = require('module').createRequire;

export default class Package extends Command {
    public static description = 'packages up your App in a distributable format';
    public static aliases = ['p', 'pack'];

    public static flags = {
        help: flags.help({ char: 'h' }),
        // flag with no value (-f, --force)
        force: flags.boolean({
            char: 'f',
            description: 'forcefully package the App, ignores lint & TypeScript errors',
        }),
    };

    public async run(): Promise<void> {

        cli.action.start('packaging your app');

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e);
            return;
        }

        const compiler = new AppsCompiler({
            tool: packageInfo.name,
            version: packageInfo.version,
            when: new Date(),
        }, this.getTypescriptForApp(fd) as any); // typing this is hard

        const result = await compiler.compile(fd.folder);

        if (result.diagnostics.length) {
            this.reportDiagnostics(result.diagnostics);
            this.error('TypeScript compiler asldk error(s) occurred');
            this.exit(1);
            return;
        }

        const zipName = path.join('dist', `${fd.info.nameSlug}_${fd.info.version}.zip`);
        await compiler.outputZip(zipName);

        cli.action.stop('finished!');

        this.log(chalk.black(' '));
        this.log(chalk.green('App packaged up at:'), path.join(fd.folder, zipName));
    }

    private getTypescriptForApp(fd: FolderDetails): typeof TS {
        const appRequire = createRequire(fd.mergeWithFolder('app.json'));

        return appRequire('typescript');
    }

    private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
        diag.forEach((d) => this.error(d.message));
    }
}
