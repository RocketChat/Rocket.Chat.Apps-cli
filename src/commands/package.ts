import {Command, Flags, ux} from '@oclif/core'
import {ICompilerDiagnostic} from '@rocket.chat/apps-compiler/definition'
import chalk from 'chalk'

import {AppCompiler, AppPackager, FolderDetails} from '../misc'

export default class Package extends Command {
  static description = 'packages up your App in a distributable format'
  static aliases = ['p', 'pack']

  static flags = {
    help: Flags.help({char: 'h'}),
    'no-compile': Flags.boolean({
      description: "don't compile the source, package as is (for older Rocket.Chat versions)",
    }),
    'experimental-native-compiler': Flags.boolean({
      description: '(experimental) use native TSC compiler',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'forcefully package the App, ignores lint & TypeScript errors',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'show additional details about the results of running the command',
    }),
  }

  async run(): Promise<void> {
    ux.action.start('packaging your app')

    const fd = new FolderDetails(this)

    try {
      await fd.readInfoFile()
      await fd.matchAppsEngineVersion()
    } catch (e) {
      this.error(e && (e as Error).message ? (e as Error).message : String(e))
      return
    }

    const {flags} = await this.parse(Package)

    const compiler = new AppCompiler(fd, flags['experimental-native-compiler'])

    const compilationResult = await compiler.compile()

    if (flags.verbose) {
      this.log(`${chalk.green('[info]')} using TypeScript v${compilationResult.typeScriptVersion}`)
    }

    if (compilationResult.diagnostics.length && !flags.force) {
      this.reportDiagnostics(compilationResult.diagnostics)
      this.error('TypeScript compiler error(s) occurred')
      this.exit(1)
      return
    }

    const bundlingResult = await compiler.bundle()

    if (bundlingResult.diagnostics.length && !flags.force) {
      this.reportDiagnostics(bundlingResult.diagnostics)
      this.error('Bundler error(s) occurred')
      this.exit(1)
      return
    }

    let zipName: string

    if (flags['no-compile']) {
      const packager = new AppPackager(this, fd)
      zipName = await packager.zipItUp()
    } else {
      zipName = await compiler.outputZip()
    }

    this.log('finished!')

    this.log(chalk.black(' '))
    this.log(chalk.green('App packaged up at:'), fd.mergeWithFolder(zipName))
  }

  private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
    diag.forEach((d) => this.error(d.message))
  }
}
