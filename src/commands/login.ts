import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';

import { CloudAuth } from '../misc/cloudAuth';

export default class Login extends Command {
    public static description = 'steps through the process to log in with Rocket.Chat Cloud';

    public static flags = {
        help: flags.help({ char: 'h' }),
    };

    public async run() {
        inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

        const cloudAuth = new CloudAuth();
        const hasToken = await cloudAuth.hasToken();
        if (hasToken) {
            await cloudAuth.getToken();
            cli.log(chalk.green('you are already logged in!'));
        } else {
            try {
                cli.log(chalk.green('*') + ' ' + chalk.gray('waiting for authorization...'));
                await cloudAuth.executeAuthFlow();
                cli.action.stop('success!');
            } catch (e) {
                cli.action.stop('failure to authenticate.');
                return;
            }
        }
    }
}
