import {Command} from '@oclif/core'
import {exec} from 'child_process'
import * as fs from 'fs'
import {pascalCase} from 'pascal-case'

import {
  editorConfigTemplate,
  gitIgnoreTemplate,
  mainTemplate,
  packageJsonTemplate,
  readmeTemplate,
  tsConfigTemplate,
  tsLintConfigTemplate,
  vsCodeExtsTemplate,
} from '../templates/app/index'
import {FolderDetails} from './folderDetails'

export class AppCreator {
  constructor(
    private fd: FolderDetails,
    private command: Command,
  ) {}

  public async writeFiles(): Promise<void> {
    fs.mkdirSync(this.fd.folder)
    this.createAppJson()
    this.createServerInfoJson()
    this.createMainTypeScriptFile()
    this.createBlankIcon()
    this.createdReadme()
    this.createTsConfig()
    this.createTsLintConfig()
    this.createPackageJson()
    this.createGitIgnore()
    this.createEditorConfig()
    this.createVsCodeExts()

    await this.runNpmInstall()
  }

  private createAppJson(): void {
    fs.writeFileSync(this.fd.mergeWithFolder('app.json'), JSON.stringify(this.fd.info, undefined, 4), 'utf8')
  }

  private createServerInfoJson(): void {
    const toWrite = {
      url: 'http://localhost:3000',
      username: '',
      password: '',
      ignoredFiles: [
        '**/README.md',
        '**/package-lock.json',
        '**/package.json',
        '**/tslint.json',
        '**/tsconfig.json',
        '**/*.js',
        '**/*.js.map',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/dist/**',
        '**/.*',
      ],
    }

    fs.writeFileSync(this.fd.mergeWithFolder('.rcappsconfig'), JSON.stringify(toWrite, null, 4), 'utf8')
  }

  private createMainTypeScriptFile(): void {
    const toWrite = mainTemplate(pascalCase(this.fd.info.name))
    fs.writeFileSync(this.fd.mergeWithFolder(this.fd.info.classFile), toWrite, 'utf8')
  }

  private createBlankIcon(): void {
    // tslint:disable-next-line
    const base64String =
      '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'

    fs.writeFileSync(this.fd.mergeWithFolder(this.fd.info.iconFile), Buffer.from(base64String, 'base64'))
  }

  // tslint:disable:max-line-length
  private createdReadme(): void {
    const toWrite = readmeTemplate(this.fd.info.name, this.fd.info.description)
    fs.writeFileSync(this.fd.mergeWithFolder('README.md'), toWrite, 'utf8')
  }

  private createTsConfig(): void {
    const toWrite = tsConfigTemplate()
    fs.writeFileSync(this.fd.mergeWithFolder('tsconfig.json'), toWrite, 'utf8')
  }

  private createTsLintConfig(): void {
    const toWrite = tsLintConfigTemplate()
    fs.writeFileSync(this.fd.mergeWithFolder('tslint.json'), toWrite, 'utf8')
  }

  private createPackageJson(): void {
    const toWrite = packageJsonTemplate()
    fs.writeFileSync(this.fd.mergeWithFolder('package.json'), toWrite, 'utf8')
  }

  private createGitIgnore(): void {
    const toWrite = gitIgnoreTemplate()
    fs.writeFileSync(this.fd.mergeWithFolder('.gitignore'), toWrite, 'utf8')
  }

  private createEditorConfig(): void {
    const toWrite = editorConfigTemplate()
    fs.writeFileSync(this.fd.mergeWithFolder('.editorconfig'), toWrite, 'utf8')
  }

  private createVsCodeExts(): void {
    const toWrite = vsCodeExtsTemplate()
    fs.mkdirSync(this.fd.mergeWithFolder('.vscode'))
    fs.writeFileSync(this.fd.mergeWithFolder('.vscode/extensions.json'), toWrite, 'utf8')
  }

  // tslint:disable-next-line:promise-function-async
  private runNpmInstall(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(
        'npm install',
        {
          cwd: this.fd.folder,
        },
        (e) => {
          if (e) {
            reject()
            return
          }

          resolve()
        },
      )
    })
  }
}
