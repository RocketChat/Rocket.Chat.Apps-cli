import {Command} from '@oclif/core'
import {IAppInfo} from '@rocket.chat/apps-engine/definition/metadata'
import chalk from 'chalk'
import * as fs from 'fs/promises'
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'fs'
import * as path from 'path'
import * as process from 'process'
import {coerce as coerceVersion, diff as diffVersion} from 'semver'
import {validateAppJson, ValidationIssue} from './appJsonValidator'
import {unicodeSymbols} from './unicodeSymbols'

const getSymbol = (key: string, fallback: string): string => unicodeSymbols.get(key) ?? fallback

interface PackageJsonContent {
  devDependencies?: Record<string, string>
}

export class FolderDetails {
  public folder: string = ''
  public toZip: string = ''
  public infoFile: string = ''
  public mainFile: string
  public info: IAppInfo

  constructor(private command: Command) {
    this.setFolder(process.cwd())
    this.mainFile = ''
    this.info = {} as IAppInfo
  }

  public async doesFileExist(file: string): Promise<boolean> {
    try {
      const stat = await fs.stat(file)
      return stat.isFile()
    } catch {
      return false
    }
  }

  public mergeWithFolder(item: string): string {
    return path.join(this.folder, item)
  }

  public setFolder(folderPath: string): void {
    this.folder = folderPath
    this.toZip = path.join(this.folder, '{,!(node_modules|test)/**/}*.*')
    this.infoFile = path.join(this.folder, 'app.json')
  }

  public setAppInfo(appInfo: IAppInfo): void {
    this.info = appInfo
  }

  public generateDirectory(dirName: string): void {
    const dirPath = path.join(this.folder, dirName)
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, {recursive: true})
    }
  }

  public generateEndpointClass(name: string, toWrite: string): void {
    const dir = 'endpoints'
    const dirPath = path.join(this.folder, dir)
    this.generateDirectory(dir)
    writeFileSync(path.join(dirPath, `${name}.ts`), toWrite, 'utf8')
  }

  public generateCommandClass(name: string, toWrite: string): void {
    const dir = 'slashCommands'
    const dirPath = path.join(this.folder, dir)
    this.generateDirectory(dir)
    writeFileSync(path.join(dirPath, `${name}.ts`), toWrite, 'utf8')
  }

  public readSettingsFile(): string {
    return readFileSync(path.join(this.folder, 'settings.ts'), 'utf-8')
  }

  public writeToSettingsFile(toWrite: string): void {
    writeFileSync(path.join(this.folder, 'settings.ts'), toWrite, 'utf-8')
  }
  /**
   * Validates the "app.json" file, loads it, and then retrieves the classFile property from it.
   * Throws an error when something isn't right.
   */
  public async readInfoFile(): Promise<void> {
    if (!(await this.doesFileExist(this.infoFile))) {
      throw new Error('No App found to package. Missing an "app.json" file.')
    }

    try {
      const infoContent = await fs.readFile(this.infoFile, 'utf-8')
      this.info = JSON.parse(infoContent) as IAppInfo
    } catch {
      throw new Error('The "app.json" file is invalid.')
    }

    // This errors out if it fails
    this.validateAppDotJson()

    if (!this.info.classFile) {
      throw new Error('Invalid "app.json" file. The "classFile" is required.')
    }

    this.mainFile = path.join(this.folder, this.info.classFile)

    if (!(await this.doesFileExist(this.mainFile))) {
      throw new Error(`The specified classFile (${this.mainFile}) does not exist.`)
    }
  }

  public async matchAppsEngineVersion(): Promise<void> {
    if (!this.info) {
      throw new Error('App Manifest not loaded. Exiting...')
    }

    if (!(await this.doesFileExist('package.json'))) {
      throw new Error('package.json not found. Exiting...')
    }

    const packageJsonPath = path.join(this.folder, 'package.json')
    const packageJsonText = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonText) as PackageJsonContent
    const appsEngineEntry = packageJson.devDependencies?.['@rocket.chat/apps-engine']

    if (!appsEngineEntry) {
      throw new Error('Unable to determine installed Apps Engine version.')
    }

    let appsEngineVersion = appsEngineEntry
    if (appsEngineEntry.startsWith('file:')) {
      const localPath = path.resolve(this.folder, appsEngineEntry.replace(/^file:/, ''))
      const localPackagePath = path.join(localPath, 'package.json')
      const localPackageJson = JSON.parse(await fs.readFile(localPackagePath, 'utf-8')) as {version: string}
      appsEngineVersion = localPackageJson.version
    }

    if (diffVersion(coerceVersion(appsEngineVersion)!, coerceVersion(this.info.requiredApiVersion)!)) {
      this.command.log(
        chalk.bgYellow('Warning:'),
        chalk.yellow(
          'Different versions of the Apps Engine were found between app.json (',
          this.info.requiredApiVersion,
          ') and package.json (',
          appsEngineVersion,
          ').',
          '\nUpdating app.json to reflect the same version of Apps Engine from package.json',
        ),
      )

      await this.updateInfoFileRequiredVersion(appsEngineVersion)
    }
  }

  private validateAppDotJson(): void {
    const issues = validateAppJson(this.info)

    if (issues.length > 0) {
      this.reportFailed(issues.length)
      issues.forEach((issue) => this.reportIssue(issue))

      throw new Error('Invalid "app.json" file, please ensure it matches the schema. (TODO: insert link here)')
    }
  }

  private reportFailed(issueCount: number): void {
    const results = []
    if (issueCount > 0) {
      results.push(chalk.red(`${issueCount} validation error(s)`))
    }

    this.command.log(
      chalk.red(getSymbol('cross', '✕')),
      chalk.cyan(this.infoFile),
      results.length > 0 ? `has ${results.join(' and ')}` : '',
    )
  }

  private reportIssue(issue: ValidationIssue, indent = '  ') {
    this.command.log(indent, chalk.red(`${getSymbol('pointer', '▶')} Error:`), issue.message)

    if (issue.path) {
      this.command.log(indent, '  at', chalk.blue(issue.path))
    }
  }

  private async updateInfoFileRequiredVersion(requiredApiVersion: string): Promise<void> {
    const info = {
      ...this.info,
      requiredApiVersion,
    }

    await fs.writeFile(path.join(this.folder, 'app.json'), JSON.stringify(info), 'utf-8')
    await this.readInfoFile()
  }
}
