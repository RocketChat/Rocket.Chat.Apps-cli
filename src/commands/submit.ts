import {Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'
import {promises as fs} from 'fs'
// import * as fuzzy from 'fuzzy';
import {confirm, input} from '@inquirer/prompts'
// import { Response } from 'fetch-with-proxy';

import {ICompilerDiagnostic} from '@rocket.chat/apps-compiler/definition'
import {AppCompiler, AppPackager, FolderDetails, VariousUtils} from '../misc'
import {CloudAuth} from '../misc/cloudAuth'

export default class Submit extends Command {
  public static description = 'submits an App to the Marketplace for review'

  public static flags = {
    help: Flags.help({char: 'h'}),
    update: Flags.boolean({description: 'submits an update instead of creating one'}),
    categories: Flags.string({
      char: 'c',
      description: 'a comma separated list of the categories for the App',
    }),
  }

  public async run() {
    const {flags} = await this.parse(Submit)

    //#region app packaging
    ux.action.start(`${chalk.green('packaging')} your app`)

    const fd = new FolderDetails(this)

    try {
      await fd.readInfoFile()
      await fd.matchAppsEngineVersion()
    } catch (e) {
      this.error((e as Error)?.message || String(e))
    }

    const compiler = new AppCompiler(fd)
    const compilationResult = await compiler.compile()

    if (compilationResult.diagnostics.length) {
      this.reportDiagnostics(compilationResult.diagnostics)
      this.error('TypeScript compiler error(s) occurred')
      this.exit(1)
      return
    }

    const bundlingResult = await compiler.bundle()

    if (bundlingResult.diagnostics.length) {
      this.reportDiagnostics(bundlingResult.diagnostics)
      this.error('Bundler error(s) occurred')
      this.exit(1)
      return
    }

    const packager = new AppPackager(this, fd)
    const zipName = await packager.zipItUp()

    ux.action.stop('packaged!')
    //#endregion

    //#region fetching categories
    ux.action.start(`${chalk.green('fetching')} the available categories`)

    await VariousUtils.fetchCategories()

    ux.action.stop('fetched!')
    //#endregion

    //#region asking for information
    const cloudAuth = new CloudAuth()
    const hasToken = await cloudAuth.hasToken()
    if (!hasToken) {
      const hasAccount = await confirm({
        message: 'Have you logged into our Publisher Portal?',
        default: true,
      })

      if (hasAccount) {
        try {
          ux.action.start(chalk.green('*') + ' ' + chalk.gray('waiting for authorization...'))
          await cloudAuth.executeAuthFlow()
          ux.action.stop(chalk.green('success!'))
        } catch {
          ux.action.stop(chalk.red('failed to authenticate.'))
          return
        }
      } else {
        this.error(
          'A Rocket.Chat Cloud account and a Marketplace Publisher account ' +
            'is required to submit an App to the Marketplace. (rc-apps login)',
        )
      }
    }

    if (typeof flags.update === 'undefined') {
      const isNew = await confirm({
        message: 'Is this a new App?',
        default: true,
      })

      flags.update = !isNew
    }

    let changes = ''
    if (flags.update) {
      changes = await input({
        message: 'What changes were made in this version?',
      })
    } else {
      const isFree = await confirm({
        message: 'Is this App free or will it require payment?',
        default: true,
      })

      if (!isFree) {
        this.error(
          'Paid Apps must be submitted via our Publisher Portal: ' +
            'https://marketplace.rocket.chat/publisher/new/app',
        )
      }
    }

    let selectedCategories: string[] = []
    if (flags.categories) {
      selectedCategories = flags.categories.split(',')
    } else {
      // For now, we'll use a simpler approach - user enters comma-separated categories
      const categoriesInput = await input({
        message: 'Please enter the categories for this App (comma-separated):',
        validate: (answer: string) => {
          if (!answer.trim()) {
            return 'You must choose at least one category.'
          }
          return true
        },
      })
      selectedCategories = categoriesInput.split(',').map((cat) => cat.trim())
    }

    const readyToSubmit = await confirm({
      message: 'Are you ready to submit?',
      default: false,
    })

    if (!readyToSubmit) {
      return
    }
    //#endregion

    ux.action.start(`${chalk.green('submitting')} your app`)

    const data = new FormData()
    const appFileBuffer = await fs.readFile(fd.mergeWithFolder(zipName))
    const appBytes = new Uint8Array(appFileBuffer.byteLength)
    appBytes.set(appFileBuffer)
    data.append('app', new File([appBytes], zipName, {type: 'application/zip'}))
    data.append('categories', JSON.stringify(selectedCategories))

    if (changes) {
      data.append('changes', changes)
    }

    const token = await cloudAuth.getToken()
    await this.asyncSubmitData(data, flags, fd, token)

    ux.action.stop('submitted!')
  }

  // tslint:disable:promise-function-async
  // tslint:disable-next-line:max-line-length
  private async asyncSubmitData(
    data: FormData,
    flags: Record<string, unknown>,
    fd: FolderDetails,
    token: string,
  ): Promise<unknown> {
    let url = 'https://marketplace.rocket.chat/v1/apps'
    if (flags.update) {
      url += `/${fd.info.id}`
    }

    const headers: {[key: string]: string} = {}
    if (token) {
      headers.Authorization = 'Bearer ' + token
    }

    const res = await fetch(url, {
      method: 'POST',
      body: data,
      headers,
    })

    interface APIResponse {
      status: number
      json(): Promise<{code?: number; error?: string}>
    }

    interface APIResult {
      code?: number
      error?: string
    }

    const response = res as APIResponse
    if (response.status !== 200) {
      const result: APIResult = await response.json()

      if (result.code === 467 || result.code === 466) {
        throw new Error(result.error || 'Unknown error')
      }

      throw new Error(`Failed to submit the App. Error code ${result.code}: ${result.error}`)
    } else {
      return response.json()
    }
  }

  private reportDiagnostics(diag: Array<ICompilerDiagnostic>): void {
    diag.forEach((d) => this.error(d.message))
  }
}
