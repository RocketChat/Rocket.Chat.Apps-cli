import {Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'

import {CloudAuth} from '../misc/cloudAuth'

export default class Logout extends Command {
  public static description = 'revokes the Rocket.Chat Cloud credentials'

  public static flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run() {
    const cloudAuth = new CloudAuth()
    const hasToken = await cloudAuth.hasToken()
    if (hasToken) {
      ux.action.start(chalk.red('revoking') + ' your credentials...')
      try {
        await cloudAuth.revokeToken()
        ux.action.stop(chalk.green('success!'))
      } catch {
        ux.action.stop(chalk.red('failure?'))
      }
    } else {
      this.log(chalk.red('no Rocket.Chat Cloud credentials to revoke'))
    }
  }
}
