import {Command, Flags, ux} from '@oclif/core'
import {password} from '@inquirer/prompts'
import chalk from 'chalk'
import * as semver from 'semver'

import {ICompilerDiagnostic} from '@rocket.chat/apps-compiler/definition'
import {AppCompiler, AppPackager, FolderDetails, unicodeSymbols} from '../misc'
import {getServerInfo, uploadApp} from '../misc/deployHelpers'

export default class Deploy extends Command {
  static description = 'allows deploying an App to a server'

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
    verbose: Flags.boolean({
      char: 'v',
      description: 'show additional details about the results of running the command',
    }),
    userId: Flags.string({
      char: 'i',
      description: 'UserID to use with API token (instead of username & password)',
    }),
    // flag with no value (-f, --force)
    'experimental-native-compiler': Flags.boolean({
      description: '(experimental) use native TSC compiler',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'forcefully deploy the App, ignores lint & TypeScript errors',
    }),
    update: Flags.boolean({description: 'updates the app, instead of creating'}),
    code: Flags.string({char: 'c', dependsOn: ['username'], description: '2FA code of the user'}),
    i2fa: Flags.boolean({description: 'interactively ask for 2FA code'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy)

    const fd = new FolderDetails(this)

    try {
      await fd.readInfoFile()
      await fd.matchAppsEngineVersion()
    } catch (e) {
      this.error(e && (e as Error).message ? (e as Error).message : String(e), {exit: 2})
    }

    if (flags.i2fa) {
      flags.code = await password({message: '2FA code'})
    }

    this.log(chalk.bold.greenBright('   Starting App Deployment to Server\n'))

    try {
      const serverInfo = await this.runWithAction('   Getting Server Info', async () => getServerInfo(fd, flags))

      const zipName = await this.runWithAction('   Packaging the app', async () => {
        const compiler = new AppCompiler(fd, flags['experimental-native-compiler'])

        ux.action.status = chalk.gray('compiling')
        const compilationResult = await compiler.compile()

        if (flags.verbose) {
          ux.action.pause(() => {
            this.log(`${chalk.green('[info]')} using TypeScript v${compilationResult.typeScriptVersion}`)
          })
        }

        if (compilationResult.diagnostics.length && !flags.force) {
          this.reportDiagnostics(compilationResult.diagnostics)
          this.error('TypeScript compiler error(s) occurred')
        }

        ux.action.status = chalk.gray('bundling')
        const bundlingResult = await compiler.bundle()

        if (bundlingResult.diagnostics.length && !flags.force) {
          this.reportDiagnostics(bundlingResult.diagnostics)
          this.error('Bundler error(s) occurred')
        }

        const coercedVersion = semver.coerce(serverInfo.serverVersion)
        if (coercedVersion && semver.satisfies(coercedVersion, '>=3.8')) {
          ux.action.status = chalk.gray('creating bundle')
          return compiler.outputZip()
        }

        ux.action.status = chalk.gray('creating zip')
        const packager = new AppPackager(this, fd)
        return packager.zipItUp()
      })

      await this.runWithAction('   Uploading App', async () => {
        ux.action.status = chalk.gray('sending bundle')
        await uploadApp(serverInfo, fd, zipName)
      })

      this.log(chalk.bold.greenBright('\n   Deployment complete!'))
    } catch (e) {
      this.error(
        chalk.bold.redBright(
          `   ${unicodeSymbols.get('longRightwardsSquiggleArrow')}  ${(e as Error)?.message || String(e)}`,
        ),
      )
    }
  }

  private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
    diag.forEach((d) => this.error(d.message))
  }

  private async runWithAction<T>(message: string, action: () => Promise<T>): Promise<T> {
    const successSymbol = unicodeSymbols.get('checkMark') ?? '✓'
    const failureSymbol = unicodeSymbols.get('heavyMultiplicationX') ?? '✕'

    ux.action.start(chalk.bold.greenBright(message))
    try {
      const result = await action()
      ux.action.stop(chalk.bold.greenBright(successSymbol))
      return result
    } catch (error) {
      ux.action.stop(chalk.red(failureSymbol))
      throw error
    }
  }
}
