import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as path from 'path';

import {
    AppCompiler,
    AppPackager,
    FolderDetails,
} from '../misc';

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
        const { flags } = this.parse(Package);

        cli.action.start('packaging your app');

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e.message);
            return;
        }

        const compiler = new AppCompiler(this, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid && !flags.force) {
            this.error('TypeScript compiler error(s) occurred');
            this.exit(1);
            return;
        }

        const packager = new AppPackager(this, fd);
        const zipName = await packager.zipItUp();

        cli.action.stop('finished!');

        this.log(chalk.black(' '));
        this.log(chalk.green('App packaged up at:'), path.join(fd.folder, zipName));
    }
}
