import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';

import { ICompilerDiagnostic } from '@rocket.chat/apps-compiler';
import { AppCompiler, FolderDetails, unicodeSymbols } from '../misc';
import { getServerInfo, uploadApp } from '../misc/deployHelpers';

export default class Deploy extends Command {
    public static description = 'allows deploying an App to a server';

    public static flags = {
        help: flags.help({ char: 'h' }),
        url: flags.string({
            description: 'where the app should be deployed to',
        }),
        username: flags.string({
            char: 'u',
            description: 'username to authenticate with',
        }),
        password: flags.string({
            char: 'p',
            description: 'password for the user',
        }),
        token: flags.string({
            char: 't',
            description: 'API token to use with UserID (instead of username & password)',
        }),
        userid: flags.string({
            char: 'i',
            description: 'UserID to use with API token (instead of username & password)',
        }),
        // flag with no value (-f, --force)
        force: flags.boolean({ char: 'f', description: 'forcefully deploy the App, ignores lint & TypeScript errors' }),
        update: flags.boolean({ description: 'updates the app, instead of creating' }),
        code: flags.string({ char: 'c', dependsOn: ['username'], description: '2FA code of the user' }),
        i2fa: flags.boolean({ description: 'interactively ask for 2FA code' }),
    };

    public async run() {
        const { flags } = this.parse(Deploy);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e, {exit: 2});
        }

        if (flags.i2fa) {
            flags.code = await cli.prompt('2FA code', { type: 'hide' });
        }

        cli.log(chalk.bold.greenBright('   Starting App Deployment to Server\n'));

        try {
            cli.action.start(chalk.bold.greenBright('   Getting Server Info'));
            const serverInfo = await getServerInfo(fd, flags);
            cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));

            cli.action.start(chalk.bold.greenBright('   Packaging the app'));
            const compiler = new AppCompiler(fd);
            const result = await compiler.compile();

            if (result.diagnostics.length && !flags.force) {
                this.reportDiagnostics(result.diagnostics);
                this.error('TypeScript compiler asldk error(s) occurred');
                this.exit(1);
                return;
            }

            const zipName = await compiler.outputZip();
            cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));

            cli.action.start(chalk.bold.greenBright('   Uploading App'));
            await uploadApp(serverInfo, fd, zipName);
            cli.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')));
        } catch (e) {
            cli.action.stop(chalk.red(unicodeSymbols.get('heavyMultiplicationX')));
            this.error(chalk.bold.redBright(
            `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${e && e.message ? e.message : e}`));
        }
    }

    private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
        diag.forEach((d) => this.error(d.message));
    }
}
