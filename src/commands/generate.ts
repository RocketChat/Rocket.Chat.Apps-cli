import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';

import { FolderDetails } from '../misc';
import { apiEndpointTemplate, appendNewSetting,
    initialSettingTemplate, slashCommandTemplate } from '../templates/boilerplateTemplate';

export default class Generate extends Command {
    public static description = 'Adds boilerplate code for various functions';
    public static flags = {
        help: flags.help({char: 'h'}),
        options: flags.string({
            char: 'o',
            // tslint:disable-next-line:max-line-length
            description: 'Choose the boilerplate needed a. Api Extension b. Slash Command Extension c. Settings Extension',
            options: ['a', 'b', 'c'],
        }),
    };
    public async run() {
        const { flags } = this.parse(Generate);
        const fd = new FolderDetails(this);
        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }
        let option = flags.options;
        const categories = [
            'Api Extension',
            'Slash Command Extension',
            'Settings Extension',
        ];
        if (!option) {
            inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));
            const result = await inquirer.prompt([{
                type: 'checkbox-plus',
                name: 'categories',
                message: 'Choose the boilerplate needed',
                pageSize: 10,
                highlight: true,
                searchable: true,
                validate: (answer: Array<string>) => {
                    if (answer.length === 0) {
                        return chalk.bold.redBright('You must choose at least one option.');
                    }

                    return true;
                },
                // tslint:disable:promise-function-async
                source: (answersSoFar: object, input: string) => {
                    input = input || '';

                    return new Promise((resolve) => {
                        const fuzzyResult = fuzzy.filter(input, categories);

                        const data = fuzzyResult.map((element) => {
                            return element.original;
                        });

                        resolve(data);
                    });
                },
            }] as any);
            option = (result as any).categories[0];
        }
        switch (option) {
            case 'Api Extension':
                this.ApiExtensionBoilerplate(fd);
                break;
            case 'Slash Command Extension':
                this.SlashCommandExtension(fd);
                break;
            case 'Settings Extension':
                this.SettingExtension(fd);
                break;
            default:
                break;
        }

    }

    private ApiExtensionBoilerplate = async (fd: FolderDetails): Promise<void> => {
        const name = await cli.prompt(chalk.bold.greenBright('Name of endpoint class'));
        const path = await cli.prompt(chalk.bold.greenBright('Path for endpoint'));
        const toWrite = apiEndpointTemplate(name, path);
        fd.generateEndpointClass(name, toWrite);
    }

    private SlashCommandExtension = async (fd: FolderDetails): Promise<void> => {
        const  name = await cli.prompt(chalk.bold.greenBright('Name of command class'));
        const toWrite = slashCommandTemplate(name);
        fd.generateCommandClass(name, toWrite);
    }

    private SettingExtension = async (fd: FolderDetails): Promise<void> => {
        let data;
        if (await fd.doesFileExist('settings.ts')) {
            data = fd.readSettingsFile();
        } else {
            data = initialSettingTemplate();
        }
        data = appendNewSetting(data);
        fd.writeToSettingsFile(data);
    }
}
