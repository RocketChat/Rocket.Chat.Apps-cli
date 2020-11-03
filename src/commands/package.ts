import { Command, flags } from '@oclif/command';
import { ICompilerDiagnostic } from '@rocket.chat/apps-compiler/definition';
import chalk from 'chalk';
import cli from 'cli-ux';

import { AppCompiler, AppPackager, FolderDetails } from '../misc';

export default class Package extends Command {
    public static description = 'packages up your App in a distributable format';
    public static aliases = ['p', 'pack'];

    public static flags = {
        'help': flags.help({ char: 'h' }),
        // flag with no value (-f, --force)
        'no-compile': flags.boolean({
            description: "don't compile the source, package as is (for older Rocket.Chat versions)",
        }),
        'force': flags.boolean({
            char: 'f',
            description: 'forcefully package the App, ignores lint & TypeScript errors',
        }),
        'verbose': flags.boolean({
            char: 'v',
            description: 'show additional details about the results of running the command',
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

        if (flags.verbose) {
            this.log(`${chalk.green('[info]')} using TypeScript v${ result.typeScriptVersion }`);
        }

        if (result.diagnostics.length && !flags.force) {
            this.reportDiagnostics(result.diagnostics);
            this.error('TypeScript compiler error(s) occurred');
            this.exit(1);
            return;
        }

        let zipName: string;

        if (flags['no-compile']) {
            const packager = new AppPackager(this, fd);
            zipName = await packager.zipItUp();
        } else {
            zipName = await compiler.outputZip();
        }

        cli.action.stop('finished!');

        this.log(chalk.black(' '));
        this.log(chalk.green('App packaged up at:'), fd.mergeWithFolder(zipName));
    }

    private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
        diag.forEach((d) => this.error(d.message));
    }
}
