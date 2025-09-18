import fetch from 'fetch-with-proxy'
import * as fs from 'fs'

import {IAppCategory} from './interfaces'

export class VariousUtils {
  public static slugify = function _slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of textte
  }

  public static getTsDefVersion = function _getTsDefVersion(): string {
    const devLocation = 'node_modules/@rocket.chat/apps-engine/package.json'

    if (fs.existsSync(devLocation)) {
      const info = JSON.parse(fs.readFileSync(devLocation, 'utf8'))
      return ('^' + info.version) as string
    }

    return '^1.44.0'
  }

  // tslint:disable:promise-function-async
  public static async fetchCategories(): Promise<Array<IAppCategory>> {
    const response = await fetch('https://marketplace.rocket.chat/v1/categories')
    const cats = (await response.json()) as Array<{title: string; description: string}>

    return cats.map((c) => ({
      title: c.title,
      description: c.description,
      name: c.title,
      value: c.title,
    }))
  }
}
