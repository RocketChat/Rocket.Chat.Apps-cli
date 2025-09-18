import {Command} from '@oclif/core'
import * as fs from 'fs/promises'
import {createWriteStream, statSync} from 'fs'
import {glob} from 'fs/promises'
import * as path from 'path'
import * as Yazl from 'yazl'

/* import packageInfo = require('../package.json'); */
const packageInfo = {
  version: '1.7.0',
  name: '@rocket.chat/apps-cli',
}

import {FolderDetails} from './folderDetails'

export class AppPackager {
  public static GlobIgnorePatterns: string[] = [
    '**/README.md',
    '**/tslint.json',
    '**/package-lock.json',
    '**/tsconfig.json',
    '**/*.js',
    '**/*.js.map',
    '**/*.d.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/dist/**',
    '**/.*',
  ]

  public static PackagerInfo: {[key: string]: string} = {
    tool: packageInfo.name,
    version: packageInfo.version,
  }

  constructor(
    private command: Command,
    private fd: FolderDetails,
  ) {}

  public async zipItUp(): Promise<string> {
    let matches

    try {
      matches = await this.getMatchingFiles()
    } catch (e) {
      this.command.warn(`Failed to retrieve the list of files for the App ${this.fd.info.name}.`)
      throw e
    }

    // Ensure we have some files to package up before we do the packaging
    if (matches.length === 0) {
      throw new Error('No files to package were found')
    }

    const zipName = path.join('dist', `${this.fd.info.nameSlug}_${this.fd.info.version}.zip`)
    const zip = new Yazl.ZipFile()

    zip.addBuffer(Buffer.from(JSON.stringify(AppPackager.PackagerInfo)), '.packagedby', {compress: true})

    for (const realPath of matches) {
      const zipPath = path.relative(this.fd.folder, realPath)
      const fileStat = statSync(realPath)

      const options: Partial<Yazl.Options> = {
        compress: true,
        mtime: fileStat.mtime,
        mode: fileStat.mode,
      }

      zip.addFile(realPath, zipPath, options)
    }

    zip.end()

    await this.writeZip(zip, zipName)

    return zipName
  }

  private async getMatchingFiles(): Promise<string[]> {
    const matches: string[] = []

    // Use Node.js 22 native glob
    for await (const match of glob(this.fd.toZip, {cwd: this.fd.folder})) {
      const fullPath = path.join(this.fd.folder, match)

      // Check if file should be ignored
      const shouldIgnore = AppPackager.GlobIgnorePatterns.some((pattern) => {
        return match.includes(pattern.replace('**/', '')) || match.match(pattern.replace('**/', '.*'))
      })

      if (!shouldIgnore) {
        matches.push(fullPath)
      }
    }

    return matches
  }

  private async writeZip(zip: Yazl.ZipFile, zipName: string): Promise<void> {
    await fs.mkdir(this.fd.mergeWithFolder('dist'), {recursive: true})
    const realPath = this.fd.mergeWithFolder(zipName)
    return new Promise((resolve) => {
      zip.outputStream.pipe(createWriteStream(realPath)).on('close', resolve)
    })
  }
}
