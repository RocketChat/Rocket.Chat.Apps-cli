import * as path from 'path'

import {AppsCompiler} from '@rocket.chat/apps-compiler'
import {IBundledCompilerResult, ICompilerResult} from '@rocket.chat/apps-compiler/definition'

import {FolderDetails} from './folderDetails'

/* import packageInfo = require('../package.json'); */
const packageInfo = {
  version: '1.7.0',
  name: '@rocket.chat/apps-cli',
}

import {createRequire} from 'module'

export function getTypescriptForApp(fd: FolderDetails): unknown {
  const appRequire = createRequire(fd.mergeWithFolder('app.json'))

  return appRequire('typescript')
}

export class AppCompiler {
  private compiler: AppsCompiler

  constructor(
    private fd: FolderDetails,
    useNativeCompiler = false,
  ) {
    this.compiler = new AppsCompiler(
      {
        tool: packageInfo.name,
        version: packageInfo.version,
        when: new Date(),
      },
      this.fd.folder,
      getTypescriptForApp(fd) as typeof import('typescript'),
      useNativeCompiler,
    )
  }

  public async compile(): Promise<ICompilerResult> {
    return this.compiler.compile()
  }

  public async bundle(): Promise<IBundledCompilerResult> {
    return this.compiler.bundle()
  }

  public async outputZip(): Promise<string> {
    const zipName = path.join('dist', `${this.fd.info.nameSlug}_${this.fd.info.version}.zip`)

    await this.compiler.outputZip(zipName)

    return zipName
  }
}
