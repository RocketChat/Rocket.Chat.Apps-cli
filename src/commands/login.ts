import {Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'

import {CloudAuth} from '../misc/cloudAuth'

export default class Login extends Command {
  public static description = 'steps through the process to log in with Rocket.Chat Cloud'

  public static flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run() {
    const cloudAuth = new CloudAuth()
    const hasToken = await cloudAuth.hasToken()
    if (hasToken) {
      ux.action.start(chalk.green('verifying') + ' your token...')
      try {
        await cloudAuth.getToken()
        ux.action.stop(chalk.green('success, you are already logged in!'))
      } catch {
        ux.action.stop(chalk.red('failure.'))
      }
    } else {
      try {
        ux.action.start(chalk.green('waiting') + ' for authorization...')
        await cloudAuth.executeAuthFlow()
        ux.action.stop(chalk.green('success!'))
      } catch {
        ux.action.stop(chalk.red('failed to authenticate.'))
        return
      }
    }
  }
}
