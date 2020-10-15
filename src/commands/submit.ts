import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

import { AppCompiler, FolderDetails, VariousUtils } from '../misc';
import { CloudAuth } from '../misc/cloudAuth';

export default class Submit extends Command {
    public static description = 'submits an App to the Marketplace for review';

    public static flags = {
        help: flags.help({ char: 'h' }),
        update: flags.boolean({ description: 'submits an update instead of creating one' }),
        categories: flags.string({
            char: 'c',
            description: 'a comma separated list of the categories for the App',
        }),
    };

    public async run() {
        inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

        const { flags } = this.parse(Submit);

        //#region app packaging
        cli.action.start(`${chalk.green('packaging')} your app`);

        const fd = new FolderDetails(this);

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e);
            return;
        }

        const compiler = new AppCompiler(fd);
        const report = await compiler.compile();

        if (!report.diagnostics.length) {
            this.error('TypeScript compiler error(s) occurred');
            this.exit(1);
            return;
        }

        const zipName = await compiler.outputZip();

        cli.action.stop('packaged!');
        //#endregion

        //#region fetching categories
        cli.action.start(`${chalk.green('fetching')} the available categories`);

        const categories = await VariousUtils.fetchCategories();

        cli.action.stop('fetched!');
        //#endregion

        //#region asking for information
        const cloudAuth = new CloudAuth();
        const hasToken = await cloudAuth.hasToken();
        let email = '';
        if (!hasToken) {
            const cloudAccount: any = await inquirer.prompt([{
                type: 'confirm',
                name: 'hasAccount',
                message: 'Have you logged into our Publisher Portal?',
                default: false,
            }]);

            if (cloudAccount.hasAccount) {
                try {
                    cli.action.start(chalk.green('*') + ' ' + chalk.gray('waiting for authorization...'));
                    await cloudAuth.executeAuthFlow();
                    cli.action.stop(chalk.green('success!'));
                } catch (e) {
                    cli.action.stop(chalk.red('failed to authenticate.'));
                    return;
                }
            } else {
                const result: any = await inquirer.prompt([{
                    type: 'input',
                    name: 'email',
                    message: 'What is the publisher\'s email address?',
                    validate: (answer: string) => {
                        const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/g;

                        return regex.test(answer);
                    },
                }]);

                email = result.email;
            }
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

        cli.action.start(`${chalk.green('submitting')} your app`);

        const data = new FormData();
        data.append('app', fs.createReadStream(fd.mergeWithFolder(zipName)));
        data.append('categories', JSON.stringify(selectedCategories));

        if (email) {
            data.append('email', email);
        }

        const token = await cloudAuth.getToken();
        await this.asyncSubmitData(data, flags, fd, token);

        cli.action.stop('submitted!');
    }

    // tslint:disable:promise-function-async
    // tslint:disable-next-line:max-line-length
    private async asyncSubmitData(data: FormData, flags: { [key: string]: any }, fd: FolderDetails, token: string): Promise<any> {
        let url = 'https://marketplace.rocket.chat/v1/apps';
        if (flags.update) {
            url += `/${fd.info.id}`;
        }

        const headers: { [key: string]: string } = {};
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }

        const res: Response = await fetch(url, {
            method: 'POST',
            body: data,
            headers,
        });

        if (res.status !== 200) {
            const result = await res.json();
            throw new Error(`Failed to submit the App. Error code ${result.code}: ${result.error}`);
        } else {
            return res.json();
        }
    }
}
