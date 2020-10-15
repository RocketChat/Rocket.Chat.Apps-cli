import { Command, flags } from '@oclif/command';
import { ICompilerDiagnostic } from '@rocket.chat/apps-compiler';
import chalk from 'chalk';
import cli from 'cli-ux';

import { AppCompiler, FolderDetails } from '../misc';

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

        const compiler = new AppCompiler(fd);

        const result = await compiler.compile();

        const { flags } = this.parse(Package);

        if (result.diagnostics.length && !flags.force) {
            this.reportDiagnostics(result.diagnostics);
            this.error('TypeScript compiler asldk error(s) occurred');
            this.exit(1);
            return;
        }

        const zipName = await compiler.outputZip();

        cli.action.stop('finished!');

        this.log(chalk.black(' '));
        this.log(chalk.green('App packaged up at:'), fd.mergeWithFolder(zipName));
    }

    private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
        diag.forEach((d) => this.error(d.message));
    }
}
