import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';

import { FolderDetails } from '../misc';
import {
    apiEndpointTemplate,
    appendNewSetting,
    initialSettingTemplate,
    slashCommandTemplate,
} from '../templates/boilerplate';

export default class Generate extends Command {
    public static description = 'Adds boilerplate code for various functions';
    public static flags = {
        help: flags.help({ char: 'h' }),
        options: flags.string({
            char: 'o',
            description:
                'Choose boilerplate(s): a. Api Extension, b. Slash Command, c. Settings Extension',
            options: ['a', 'b', 'c'],
            multiple: true, // Allow multiple values
        }),
    };

    public async run(): Promise<void> {
        const { flags } = this.parse(Generate);
        const fd = new FolderDetails(this);
        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(chalk.bold.red(e && e.message ? e.message : e));
        }

        // Map flag options (a/b/c) to their full names
        const optionMap: { [key: string]: string } = {
            a: 'Api Extension',
            b: 'Slash Command Extension',
            c: 'Settings Extension',
        };

        let options = flags.options
            ? flags.options.map((opt) => optionMap[opt])
            : [];

        const categories = [
            'Api Extension',
            'Slash Command Extension',
            'Settings Extension',
        ];

        if (!options.length) {
            inquirer.registerPrompt(
                'checkbox-plus',
                require('inquirer-checkbox-plus-prompt'),
            );
            const result = await inquirer.prompt([
                {
                    type: 'checkbox-plus',
                    name: 'categories',
                    message: 'Choose the boilerplate needed',
                    pageSize: 10,
                    highlight: true,
                    searchable: true,
                    validate: (answer: Array<string>) => {
                        if (answer.length === 0) {
                            return chalk.bold.redBright(
                                'You must choose at least one option.',
                            );
                        }
                        return true;
                    },
                    source: async (answersSoFar: object, input: string) => {
                        const fuzzyResult = fuzzy.filter(input || '', categories);
                        return fuzzyResult.map((el) => el.original);
                    },
                },
            ] as any);
            options = (result as any).categories;
        }

        // Process each selected option
        for (const option of options) {
            switch (option) {
                case 'Api Extension':
                    await this.ApiExtensionBoilerplate(fd);
                    break;
                case 'Slash Command Extension':
                    await this.SlashCommandExtension(fd);
                    break;
                case 'Settings Extension':
                    await this.SettingExtension(fd);
                    break;
                default:
                    break;
            }
        }
    }

    private ApiExtensionBoilerplate = async (
        fd: FolderDetails,
    ): Promise<void> => {
        const name = await cli.prompt(
            chalk.bold.greenBright('Name of API endpoint class'),
        );
        const path = await cli.prompt(
            chalk.bold.greenBright('Path for API endpoint'),
        );
        const toWrite = apiEndpointTemplate(name, path);
        fd.generateEndpointClass(name, toWrite);
    }

    private SlashCommandExtension = async (
        fd: FolderDetails,
    ): Promise<void> => {
        const name = await cli.prompt(
            chalk.bold.greenBright('Name of slash command class'),
        );
        const toWrite = slashCommandTemplate(name);
        fd.generateCommandClass(name, toWrite);
    }

    private SettingExtension = async (fd: FolderDetails): Promise<void> => {
        let data = '';
        if (await fd.doesFileExist('settings.ts')) {
            data = fd.readSettingsFile();
        }
        if (data === '') {
            data = initialSettingTemplate();
        }
        data = appendNewSetting(data);
        fd.writeToSettingsFile(data);
    }
}
