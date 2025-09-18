import {Command, Flags} from '@oclif/core'
import {select, input} from '@inquirer/prompts'
import chalk from 'chalk'

import {FolderDetails} from '../misc'
import {
  apiEndpointTemplate,
  appendNewSetting,
  initialSettingTemplate,
  slashCommandTemplate,
} from '../templates/boilerplate'

export default class Generate extends Command {
  static description = 'Adds boilerplate code for various functions'
  static flags = {
    help: Flags.help({char: 'h'}),
    options: Flags.string({
      char: 'o',
      description: 'Choose the boilerplate needed a. Api Extension b. Slash Command Extension c. Settings Extension',
      options: ['a', 'b', 'c'],
    }),
  }
  async run(): Promise<void> {
    const {flags} = await this.parse(Generate)
    const fd = new FolderDetails(this)
    try {
      await fd.readInfoFile()
    } catch (e) {
      this.error(chalk.bold.red((e as Error)?.message || String(e)))
    }
    let option = flags.options
    if (!option) {
      option = await select({
        message: 'Choose the boilerplate needed',
        choices: [
          {name: 'Api Extension', value: 'Api Extension'},
          {name: 'Slash Command Extension', value: 'Slash Command Extension'},
          {name: 'Settings Extension', value: 'Settings Extension'},
        ],
      })
    }
    switch (option) {
      case 'Api Extension':
        this.ApiExtensionBoilerplate(fd)
        break
      case 'Slash Command Extension':
        this.SlashCommandExtension(fd)
        break
      case 'Settings Extension':
        this.SettingExtension(fd)
        break
      default:
        break
    }
  }

  private ApiExtensionBoilerplate = async (fd: FolderDetails): Promise<void> => {
    const name = await input({message: chalk.bold.greenBright('Name of endpoint class')})
    const path = await input({message: chalk.bold.greenBright('Path for endpoint')})
    const toWrite = apiEndpointTemplate(name, path)
    fd.generateEndpointClass(name, toWrite)
  }

  private SlashCommandExtension = async (fd: FolderDetails): Promise<void> => {
    const name = await input({message: chalk.bold.greenBright('Name of command class')})
    const toWrite = slashCommandTemplate(name)
    fd.generateCommandClass(name, toWrite)
  }

  private SettingExtension = async (fd: FolderDetails): Promise<void> => {
    let data = ''
    if (await fd.doesFileExist('settings.ts')) {
      data = fd.readSettingsFile()
    }
    if (data === '') {
      data = initialSettingTemplate()
    }
    data = appendNewSetting(data)
    fd.writeToSettingsFile(data)
  }
}
