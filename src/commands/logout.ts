import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';

import { CloudAuth } from '../misc/cloudAuth';

export default class Logout extends Command {
    public static description = 'revokes the Rocket.Chat Cloud credentials';

    public static flags = {
        help: flags.help({ char: 'h' }),
    };

    public async run() {
        inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

        const cloudAuth = new CloudAuth();
        const hasToken = await cloudAuth.hasToken();
        if (hasToken) {
            cli.action.start(chalk.red('revoking') + ' your credentials...');
            try {
                await cloudAuth.revokeToken();
                cli.action.stop(chalk.green('success!'));
            } catch (e) {
                cli.action.stop(chalk.red('failure?'));
            }
        } else {
            cli.log(chalk.red('no Rocket.Chat Cloud credentials to revoke'));
        }
    }
}
