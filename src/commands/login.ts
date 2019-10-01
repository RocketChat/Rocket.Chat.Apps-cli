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
            cli.action.start(chalk.green('verifying') + ' your token...');
            await cloudAuth.getToken();
            cli.action.stop(chalk.green('success, you are already logged in!'));
        } else {
            try {
                cli.action.start(chalk.green('waiting') + ' for authorization...');
                await cloudAuth.executeAuthFlow();
                cli.action.stop(chalk.green('success!'));
            } catch (e) {
                cli.action.stop(chalk.red('failed to authenticate.'));
                return;
            }
        }
    }
}
