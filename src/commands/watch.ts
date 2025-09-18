import {Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'
import * as chokidar from 'chokidar'

import {ICompilerDiagnostic} from '@rocket.chat/apps-compiler/definition'
import {AppCompiler, FolderDetails, unicodeSymbols} from '../misc'
import {checkUpload, getIgnoredFiles, getServerInfo, uploadApp} from '../misc/deployHelpers'

export default class Watch extends Command {
  static description = 'watches for changes in the app and redeploys to the server'

  static flags = {
    help: Flags.help({char: 'h'}),
    url: Flags.string({
      description: 'where the app should be deployed to',
    }),
    username: Flags.string({
      char: 'u',
      description: 'username to authenticate with',
    }),
    password: Flags.string({
      char: 'p',
      description: 'password for the user',
    }),
    token: Flags.string({
      char: 't',
      description: 'API token to use with UserID (instead of username & password)',
    }),
    userId: Flags.string({
      char: 'i',
      description: 'UserID to use with API token (instead of username & password)',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'show additional details about the results of running the command',
    }),
    // flag with no value (-f, --force)
    'experimental-native-compiler': Flags.boolean({
      description: '(experimental) use native TSC compiler',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'forcefully deploy the App, ignores lint & TypeScript errors',
    }),
    code: Flags.string({char: 'c', dependsOn: ['username'], description: '2FA code of the user'}),
    i2fa: Flags.boolean({description: 'interactively ask for 2FA code'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Watch)

    const fd = new FolderDetails(this)

    try {
      await fd.readInfoFile()
      await fd.matchAppsEngineVersion()
    } catch (e) {
      this.error(chalk.bold.red((e as Error)?.message || String(e)), {exit: 2})
    }

    if (flags.i2fa) {
      const inquirer = await import('inquirer')
      const response = await inquirer.default.prompt([
        {
          type: 'password',
          name: 'code',
          message: '2FA code',
        },
      ])
      flags.code = response.code
    }

    let ignoredFiles: Array<string>
    try {
      ignoredFiles = await getIgnoredFiles(fd)
    } catch (e) {
      this.error(chalk.bold.red((e as Error)?.message || String(e)))
    }

    chokidar
      .watch(fd.folder, {
        ignored: ignoredFiles,
        awaitWriteFinish: true,
        persistent: true,
        interval: 300,
      })
      .on('change', async () => {
        tasks(this, fd, flags).catch((e) => {
          this.log(
            chalk.bold.redBright(
              `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${(e as Error)?.message || String(e)}`,
            ),
          )
        })
      })
      .on('ready', async () => {
        tasks(this, fd, flags).catch((e) => {
          this.log(
            chalk.bold.redBright(
              `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${(e as Error)?.message || String(e)}`,
            ),
          )
        })
      })
  }
}

function reportDiagnostics(command: Command, diag: Array<ICompilerDiagnostic>): void {
  diag.forEach((d) => command.error(d.message))
}

const tasks = async (command: Command, fd: FolderDetails, flags: Record<string, unknown>): Promise<void> => {
  try {
    ux.action.start(chalk.bold.greenBright('   Packaging the app'))
    const compiler = new AppCompiler(fd, flags['experimental-native-compiler'] as boolean)
    const result = await compiler.compile()

    if (flags.verbose) {
      command.log(`${chalk.green('[info]')} using TypeScript v${result.typeScriptVersion}`)
    }

    if (result.diagnostics.length && !flags.force) {
      reportDiagnostics(command, result.diagnostics)
      command.error('TypeScript compiler error(s) occurred')
      command.exit(1)
      return
    }

    const zipName = await compiler.outputZip()
    ux.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')))

    ux.action.start(chalk.bold.greenBright('   Getting Server Info'))
    const serverInfo = await getServerInfo(fd, flags)
    ux.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')))

    const status = await checkUpload({...flags, ...serverInfo}, fd)
    if (status) {
      ux.action.start(chalk.bold.greenBright('   Updating App'))
      await uploadApp({...serverInfo, update: true}, fd, zipName)
      ux.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')))
    } else {
      ux.action.start(chalk.bold.greenBright('   Uploading App'))
      await uploadApp(serverInfo, fd, zipName)
      ux.action.stop(chalk.bold.greenBright(unicodeSymbols.get('checkMark')))
    }
  } catch (e) {
    ux.action.stop(chalk.red(unicodeSymbols.get('heavyMultiplicationX')))
    throw new Error(String(e))
  }
}
