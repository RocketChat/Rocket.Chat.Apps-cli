import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

import { AppCompiler, AppPackager, FolderDetails, VariousUtils } from '../misc';

export default class Submit extends Command {
    public static description = 'submits an App to the Marketplace for review';

    public static flags = {
        help: flags.help({ char: 'h' }),
        // In the future, we will allow people to have their own marketplace instances
        // url: flags.string({ description: 'which marketplace should be used' }),
        update: flags.boolean({ description: 'submits an update instead of creating one' }),
        email: flags.string({ char: 'e', description: 'the email of the publisher account' }),
        categories: flags.string({
            char: 'c',
            dependsOn: ['email'],
            description: 'a comma separated list of the categories for the App',
        }),
    };

    public async run() {
        inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

        const { flags } = this.parse(Submit);

        //#region app packaging
        cli.action.start(`${ chalk.green('packaging') } your app`);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e.message);
            return;
        }

        const compiler = new AppCompiler(this, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid) {
            this.error('TypeScript compiler error(s) occurred');
            this.exit(1);
            return;
        }

        const packager = new AppPackager(this, fd);
        const zipName = await packager.zipItUp();

        cli.action.stop('packaged!');
        //#endregion

        //#region fetching categories
        cli.action.start(`${ chalk.green('fetching') } the available categories`);

        const categories = await VariousUtils.fetchCategories();

        cli.action.stop('fetched!');
        //#endregion

        //#region asking for information
        if (!flags.email) {
            const result = await inquirer.prompt([{
                type: 'input',
                name: 'email',
                message: 'What is the publisher\'s email address?',
                validate: (answer: string) => {
                    const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/g;

                    return regex.test(answer);
                },
            }]);

            flags.email = (result as any).email;
        }

        if (typeof flags.update === 'undefined') {
            const isNewApp = await inquirer.prompt([{
                type: 'confirm',
                name: 'isNew',
                message: 'Is this a new App?',
                default: true,
            }]);

            flags.update = !(isNewApp as any).isNew;
        }

        let selectedCategories = new Array<string>();
        if (flags.categories) {
            selectedCategories = flags.categories.split(',');
        } else {
            const result = await inquirer.prompt([{
                type: 'checkbox-plus',
                name: 'categories',
                message: 'Please select the categories which apply to this App?',
                pageSize: 10,
                highlight: true,
                searchable: true,
                validate: (answer: Array<string>) => {
                    if (answer.length === 0) {
                        return 'You must choose at least one color.';
                    }

                    return true;
                },
                // tslint:disable:promise-function-async
                source: (answersSoFar: object, input: string) => {
                    input = input || '';

                    return new Promise((resolve) => {
                        const fuzzyResult = fuzzy.filter(input, categories, {
                            extract: (item) => item.name,
                        });

                        const data = fuzzyResult.map((element) => {
                            return element.original;
                        });

                        resolve(data);
                    });
                },
            }] as any);
            selectedCategories = (result as any).categories;
        }

        const confirmSubmitting = await inquirer.prompt([{
            type: 'confirm',
            name: 'submit',
            message: 'Are you ready to submit?',
            default: false,
        }]);

        if (!(confirmSubmitting as any).submit) {
            return;
        }
        //#endregion

        cli.action.start(`${ chalk.green('submitting') } your app`);

        const data = new FormData();
        data.append('app', fs.createReadStream(fd.mergeWithFolder(zipName)));
        data.append('email', flags.email);
        data.append('categories', JSON.stringify(selectedCategories));
        data.append('purchaseType', 'buy');
        data.append('price', 0);

        await this.asyncSubmitData(data, flags, fd);

        cli.action.stop('submitted!');
    }

    // tslint:disable:promise-function-async
    private async asyncSubmitData(data: FormData, flags: { [key: string]: any }, fd: FolderDetails): Promise<any> {
        let url = 'https://marketplace.rocket.chat/v1/apps';
        if (flags.update) {
            url += `/${ fd.info.id }`;
        }
        const res: Response = await fetch(url, {
            method: 'POST',
            body: data,
        });

        if (res.status !== 200) {
            const result = await res.json();
            throw new Error(`Failed to submit the App. Error code ${ result.code }: ${ result.error }`);
        } else {
            return res.json();
        }
    }
}
