import {Command, Flags} from '@oclif/core'
import {IAppInfo} from '@rocket.chat/apps-engine/definition/metadata'
import {input} from '@inquirer/prompts'
import chalk from 'chalk'
import {pascalCase} from 'pascal-case'
import * as path from 'path'
import * as semver from 'semver'
import {randomUUID} from 'crypto'

import {AppCreator, FolderDetails, VariousUtils} from '../misc'

export default class Create extends Command {
  public static description = 'simplified way of creating an app'

  static flags = {
    help: Flags.help({char: 'h'}),
    name: Flags.string({char: 'n', description: 'Name of the app'}),
    description: Flags.string({char: 'd', description: 'Description of the app'}),
    author: Flags.string({char: 'a', description: "Author's name"}),
    homepage: Flags.string({char: 'H', description: "Author's or app's home page"}),
    support: Flags.string({char: 's', description: 'URL or email address to get support for the app'}),
  }

  async run(): Promise<void> {
    if (!semver.satisfies(process.version, '>=22.0.0')) {
      this.error('NodeJS version needs to be at least 22.0.0 or higher.')
      return
    }

    const info: IAppInfo = {
      id: randomUUID(),
      version: '0.0.1',
      requiredApiVersion: VariousUtils.getTsDefVersion(),
      iconFile: 'icon.png',
      author: {},
    } as IAppInfo

    this.log("Let's get started creating your app.")
    this.log('We need some information first:')
    this.log('')

    const {flags} = await this.parse(Create)
    info.name = flags.name ? flags.name : await input({message: chalk.bold('   App Name')})
    info.nameSlug = VariousUtils.slugify(info.name)
    info.classFile = `${pascalCase(info.name)}App.ts`

    info.description = flags.description ? flags.description : await input({message: chalk.bold('   App Description')})
    info.author.name = flags.author ? flags.author : await input({message: chalk.bold("   Author's Name")})
    info.author.homepage = flags.homepage ? flags.homepage : await input({message: chalk.bold("   Author's Home Page")})
    info.author.support = flags.support ? flags.support : await input({message: chalk.bold("   Author's Support Page")})

    const folder = path.join(process.cwd(), info.nameSlug)

    this.log(`Creating a Rocket.Chat App in ${chalk.green(folder)}`)

    const fd = new FolderDetails(this)
    fd.setAppInfo(info)
    fd.setFolder(folder)

    const creator = new AppCreator(fd, this)
    await creator.writeFiles()

    try {
      await fd.readInfoFile()
    } catch (e) {
      this.error(e && (e as Error).message ? (e as Error).message : String(e))
      return
    }

    this.log(chalk.cyan('done!'))
  }
}
