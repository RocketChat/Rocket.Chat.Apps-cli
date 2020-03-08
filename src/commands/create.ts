import { Command, flags } from '@oclif/command';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import chalk from 'chalk';
import cli from 'cli-ux';
import pascalCase = require('pascal-case');
import * as path from 'path';
import * as semver from 'semver';
import * as uuid from 'uuid';

import {
    AppCompiler,
    AppCreator,
    AppPackager,
    FolderDetails,
    VariousUtils,
} from '../misc';

const checkUrl = (url: string) => {
    // tslint:disable-next-line:max-line-length
    const urlRegexp =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
    if (urlRegexp.test(url)) {
        return true;
    } else {
        return false;
    }
};

const checkUrlOrEmail = (url: string) => {
    // tslint:disable-next-line:max-line-length
    const emailRegexp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (checkUrl(url) || emailRegexp.test(url)) {
        return true;
    } else {
        return false;
    }
};

export default class Create extends Command {
    public static description = 'simplified way of creating an app';

    public static flags = {
        help: flags.help({ char: 'h' }),
    };

    public async run() {
        if (!semver.satisfies(process.version, '>=4.2.0')) {
            this.error('NodeJS version needs to be at least 4.2.0 or higher.');
            return;
        }

        const info: IAppInfo = {
            id: uuid.v4(),
            version: '0.0.1',
            requiredApiVersion: VariousUtils.getTsDefVersion(),
            iconFile: 'icon.png',
            author: {},
        } as IAppInfo;

        this.log('Let\'s get started creating your app.');
        this.log('We need some information first:');
        this.log('');

        info.name = await cli.prompt(chalk.bold('   App Name'));
        info.nameSlug = VariousUtils.slugify(info.name);
        info.classFile = `${ pascalCase(info.name) }App.ts`;

        info.description = await cli.prompt(chalk.bold('   App Description'));
        info.author.name = await cli.prompt(chalk.bold('   Author\'s Name'));
        let homepage = await cli.prompt(chalk.bold('   Author\'s Home Page'));
        while (!checkUrl(homepage)) {
            homepage = await cli.prompt(chalk.bold('   Author\'s Home Page (Enter correct url)'));
            if (checkUrl(homepage)) { break; }
        }
        info.author.homepage = homepage;
        let supportpage = await cli.prompt(chalk.bold('   Author\'s Support Page'));
        while (!checkUrlOrEmail(supportpage)) {
            supportpage = await cli.prompt(chalk.bold('   Author\'s Support Page (Enter correct url or email)'));
            if (checkUrl(supportpage)) { break; }
        }
        info.author.support = supportpage;

        this.log('');

        const folder = path.join(process.cwd(), info.nameSlug);

        cli.action.start(`Creating a Rocket.Chat App in ${ chalk.green(folder) }`);

        const fd = new FolderDetails(this);
        fd.setAppInfo(info);
        fd.setFolder(folder);

        const creator = new AppCreator(fd, this);
        await creator.writeFiles();

        try {
            await fd.readInfoFile();
        } catch (e) {
            this.error(e && e.message ? e.message : e);
            return;
        }

        const compiler = new AppCompiler(this, fd);
        const report = compiler.logDiagnostics();

        if (!report.isValid) {
            throw new Error('invalid.');
        }

        const packager = new AppPackager(this, fd);
        await packager.zipItUp();

        cli.action.stop(chalk.cyan('done!'));
    }
}
