import Command from '@oclif/command';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import chalk from 'chalk';
import * as compareVersions from 'compare-versions';
import * as figures from 'figures';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as process from 'process';
import * as tv4 from 'tv4';
import { VariousUtils } from './variousUtils';

import { appJsonSchema } from './appJsonSchema';

export class FolderDetails {
    public folder: string;
    public toZip: string;
    public infoFile: string;
    public mainFile: string;
    public info: IAppInfo;

    constructor(private command: Command) {
        this.setFolder(process.cwd());
        this.mainFile = '';
        this.info = {} as IAppInfo;
    }

    public async doesFileExist(file: string): Promise<boolean> {
        return await fs.pathExists(file) && fs.statSync(file).isFile();
    }

    public mergeWithFolder(item: string): string {
        return path.join(this.folder, item);
    }

    public setFolder(folderPath: string): void {
        this.folder = folderPath;
        this.toZip = path.join(this.folder, '{,!(node_modules|test)/**/}*.*');
        this.infoFile = path.join(this.folder, 'app.json');
    }

    public setAppInfo(appInfo: IAppInfo): void {
        this.info = appInfo;
    }

    public generateDirectory(dirName: string): void {
        const dirPath = path.join(this.folder, dirName);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }

    public generateEndpointClass(name: string, toWrite: string): void {
        const dir = 'endpoints';
        const dirPath = path.join(this.folder, dir);
        this.generateDirectory(dir);
        fs.writeFileSync(path.join(dirPath, `${name}.ts`), toWrite, 'utf8');
    }

    public generateCommandClass(name: string, toWrite: string): void {
        const dir = 'slashCommands';
        const dirPath = path.join(this.folder, dir);
        this.generateDirectory(dir);
        fs.writeFileSync(path.join(dirPath, `${name}.ts`), toWrite, 'utf8');
    }

    public readSettingsFile(): string {
        return fs.readFileSync(path.join(this.folder, 'settings.ts'), 'utf-8');
    }

    public writeToSettingsFile(toWrite: string): void {
        fs.writeFileSync(path.join(this.folder, 'settings.ts'), toWrite, 'utf-8');
    }
    /**
     * Validates the "app.json" file, loads it, and then retrieves the classFile property from it.
     * Throws an error when something isn't right.
     */
    public async readInfoFile(): Promise<void> {
        if (!(await this.doesFileExist(this.infoFile))) {
            throw new Error('No App found to package. Missing an "app.json" file.');
        }

        try {
            this.info = require(this.infoFile);
        } catch (e) {
            throw new Error('The "app.json" file is invalid.');
        }

        // This errors out if it fails
        this.validateAppDotJson();

        if (!this.info.classFile) {
            throw new Error('Invalid "app.json" file. The "classFile" is required.');
        }

        this.mainFile = path.join(this.folder, this.info.classFile);

        if (!(await this.doesFileExist(this.mainFile))) {
            throw new Error(`The specified classFile (${ this.mainFile }) does not exist.`);
        }
    }

    public async matchAppsEngineVersion(): Promise<void> {
        if (!this.info) {
            throw new Error('App Manifest not loaded. Exiting...');
        }

        if (!await this.doesFileExist('package.json')) {
            throw new Error('package.json not found. Exiting...');
        }

        const packageJson = require(path.join(this.folder, 'package.json'));
        const appsEngineVersion = packageJson.devDependencies['@rocket.chat/apps-engine'];

        if (!compareVersions
            .compare(VariousUtils.stripVersionRangeSugar(appsEngineVersion),
                     VariousUtils.stripVersionRangeSugar(this.info.requiredApiVersion),
                     '=')) {

            // tslint:disable-next-line:no-console
            console.log(chalk.bgYellow('Warning:'),
                        chalk.yellow('Different versions of the Apps Engine were found between app.json (',
                        this.info.requiredApiVersion,
                        ') and package.json (',
                        appsEngineVersion,
                        ').\n',
                        'Updating app.json to reflect the same version of Apps Engine from package.json'));

            await this.updateInfoFileRequiredVersion(appsEngineVersion);
        }
    }

    private validateAppDotJson(): void {
        const result = tv4.validateMultiple(this.info, appJsonSchema);

        // We only care if the result is invalid, as it should pass successfully
        if (!this.isValidResult(result)) {
            this.reportFailed(result.errors.length, result.missing.length);

            result.errors.forEach((e: tv4.ValidationError) => this.reportError(e));
            result.missing.forEach((v: string) => this.reportMissing(v));

            throw new Error('Invalid "app.json" file, please ensure it matches the schema. (TODO: insert link here)');
        }
    }

    private isValidResult(result: tv4.MultiResult): boolean {
        return result.valid && result.missing.length === 0;
    }

    private reportFailed(errorCount: number, missingCount: number): void {
        const results = [];
        if (errorCount > 0) {
            results.push(chalk.red(`${errorCount} validation error(s)`));
        }

        if (missingCount > 0) {
            results.push(chalk.red(`${missingCount} missing schema(s)`));
        }

        this.command.log(
            chalk.red(figures.cross),
            chalk.cyan(this.infoFile),
            results.length > 0 ? `has ${results.join(' and ')}` : '',
        );
    }

    private reportError(error: tv4.ValidationError, indent = '  ') {
        this.command.log(
            indent,
            chalk.red(`${figures.pointerSmall} Error:`),
            error.message || 'No error message provided by validation module',
        );

        this.command.log(
            indent,
            '  at',
            chalk.blue(error.dataPath || '/'),
            'against schema',
            chalk.blue(error.schemaPath || '/'),
        );

        if (error.subErrors) {
            error.subErrors.forEach((err) => this.reportError(err, `${indent}  `));
        }
    }

    private reportMissing(uri: string, indent = '  ') {
        this.command.log(
            indent,
            chalk.red(`${figures.pointerSmall} Missing:`),
            uri,
        );
    }

    private async updateInfoFileRequiredVersion(requiredApiVersion: string): Promise<void> {
        const info = {
            ...this.info,
            requiredApiVersion,
        };

        await fs.writeFile(path.join(this.folder, 'app.json'), JSON.stringify(info), 'utf-8');
        await this.readInfoFile();
    }
}
