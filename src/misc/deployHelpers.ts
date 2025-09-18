import {Command} from '@oclif/core'
import chalk from 'chalk'
import {promises as fs} from 'fs'

import {AppPackager, FolderDetails} from '.'

export interface DeployFlags extends Record<string, unknown> {
  url?: string
  username?: string
  password?: string
  userId?: string
  token?: string
  code?: string
  update?: boolean
  serverVersion?: string
}

interface ServerInfoResponse {
  version?: string
}

interface AuthData {
  authToken: string
  userId: string
}

interface AuthResponse {
  status?: 'success' | 'error' | string
  success?: boolean
  data?: AuthData
  error?: string
  messages?: unknown
}

export const getServerInfo = async (fd: FolderDetails, flags: DeployFlags): Promise<DeployFlags> => {
  let loginInfo: DeployFlags = {...flags}
  try {
    if (await fd.doesFileExist(fd.mergeWithFolder('.rcappsconfig'))) {
      const rawConfig = await fs.readFile(fd.mergeWithFolder('.rcappsconfig'), 'utf-8')
      const parsedConfig = JSON.parse(rawConfig) as Partial<DeployFlags>
      loginInfo = {...parsedConfig, ...loginInfo}
    }
  } catch (e) {
    throw new Error((e as Error)?.message || String(e))
  }

  try {
    const {url} = loginInfo
    if (typeof url !== 'string' || !url) {
      throw new Error('')
    }

    const response = await fetch(normalizeUrl(url, '/api/info'))
    const serverInfo = (await response.json()) as ServerInfoResponse

    if (serverInfo.version) {
      loginInfo.serverVersion = serverInfo.version
    }
  } catch {
    const url = typeof loginInfo.url === 'string' ? loginInfo.url : 'the provided url'
    throw new Error(`Problems conecting to Rocket.Chat at ${url} - please check the address`)
  }

  // tslint:disable-next-line:max-line-length
  const providedLoginArguments = (loginInfo.username && loginInfo.password) || (loginInfo.userId && loginInfo.token)
  if (loginInfo.url && providedLoginArguments) {
    return loginInfo
  }

  if (!loginInfo.url && providedLoginArguments) {
    throw new Error(`
    No url found.
    Consider adding url with the flag --url
    or create a .rcappsconfig file and add the url as
    {
        "url": "your-server-url"
    }
            `)
  } else {
    if (loginInfo.password || loginInfo.username) {
      if (!loginInfo.password) {
        throw new Error(`
    No password found for username.
    Consider adding password as a flag with -p="your-password"
    or create a .rcappsconfig file and add the password as
    {
        "password":"your-password"
    }
                    `)
      } else {
        throw new Error(`
    No username found for given password.
    Consider adding username as a flag with -u="your-username"
    or create a .rcappsconfig file and add the username as
    {
        "username":"your-username"
    }
                    `)
      }
    } else if (loginInfo.token || loginInfo.userId) {
      if (!loginInfo.token) {
        throw new Error(`
    No token found for given user Id.
    Consider adding token as a flag with -t="your-token"
    or create a .rcappsconfig file and add the token as
    {
        "token":"your-token"
    }
                    `)
      } else {
        throw new Error(`
    No user Id found for given token.
    Consider adding user Id as a flag with -i="your-userId"
    or create a .rcappsconfig file and add the user Id as
    {
        "userId":"your-userId"
    }
                    `)
      }
    } else {
      throw new Error(`
    No login arguments found.
    Consider adding the server url with either username and password
    or userId and personal access token through flags
    or create a .rcappsconfig file to pass them as a JSON object.
                `)
    }
  }
}

export const packageAndZip = async (command: Command, fd: FolderDetails): Promise<string> => {
  const packager = new AppPackager(command, fd)
  try {
    return packager.zipItUp()
  } catch (e) {
    throw new Error(String(e))
  }
}

export const uploadApp = async (flags: DeployFlags, fd: FolderDetails, zipname: string) => {
  const data = new FormData()
  const appFileBuffer = await fs.readFile(fd.mergeWithFolder(zipname))
  const appBytes = new Uint8Array(appFileBuffer.byteLength)
  appBytes.set(appFileBuffer)
  data.append('app', new File([appBytes], zipname, {type: 'application/zip'}))

  if (fd.info.permissions) {
    data.append('permissions', JSON.stringify(fd.info.permissions))
  }

  try {
    await asyncSubmitData(data, flags, fd)
  } catch (e) {
    throw new Error(String(e))
  }
}

// tslint:disable-next-line:max-line-length
export const checkUpload = async (flags: DeployFlags, fd: FolderDetails): Promise<boolean> => {
  let authResult: AuthResponse
  const url = typeof flags.url === 'string' ? flags.url : undefined
  if (!url) {
    throw new Error('Url not found')
  }

  if (!flags.token) {
    const username = typeof flags.username === 'string' ? flags.username : undefined
    const password = typeof flags.password === 'string' ? flags.password : undefined
    const code = typeof flags.code === 'string' ? flags.code : undefined

    const credentials: {username: string; password: string; code?: string} = {
      username: username ?? '',
      password: password ?? '',
    }

    if (code) {
      credentials.code = code
    }

    authResult = await fetch(normalizeUrl(url, '/api/v1/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then(async (res) => (await res.json()) as AuthResponse)

    if (authResult.status === 'error' || !authResult.data) {
      throw new Error('Invalid username and password or missing 2FA code (if active)')
    }
  } else {
    const token = typeof flags.token === 'string' ? flags.token : undefined
    const userId = typeof flags.userId === 'string' ? flags.userId : undefined

    const verificationResult = await fetch(normalizeUrl(url, '/api/v1/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token ?? '',
        'X-User-Id': userId ?? '',
      },
    }).then(async (res) => (await res.json()) as AuthResponse)

    if (!verificationResult.success) {
      throw new Error('Invalid API token')
    }

    authResult = {data: {authToken: token ?? '', userId: userId ?? ''}}
  }
  const endpoint = `/api/apps/${fd.info.id}`

  if (!authResult.data) {
    throw new Error('Invalid authentication response')
  }

  const findApp = await fetch(normalizeUrl(url, endpoint), {
    method: 'GET',
    headers: {
      'X-Auth-Token': authResult.data.authToken,
      'X-User-Id': authResult.data.userId,
    },
  }).then(async (res) => (await res.json()) as {success?: boolean})
  return Boolean(findApp.success)
}

export const asyncSubmitData = async (data: FormData, flags: DeployFlags, fd: FolderDetails): Promise<void> => {
  let authResult: AuthResponse
  const url = typeof flags.url === 'string' ? flags.url : undefined
  if (!url) {
    throw new Error('Url not found')
  }
  if (!flags.token) {
    const username = typeof flags.username === 'string' ? flags.username : undefined
    const password = typeof flags.password === 'string' ? flags.password : undefined
    const code = typeof flags.code === 'string' ? flags.code : undefined

    const credentials: {username: string; password: string; code?: string} = {
      username: username ?? '',
      password: password ?? '',
    }
    if (code) {
      credentials.code = code
    }

    authResult = await fetch(normalizeUrl(url, '/api/v1/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then(async (res) => (await res.json()) as AuthResponse)

    if (authResult.status === 'error' || !authResult.data) {
      throw new Error('Invalid username and password or missing 2FA code (if active)')
    }
  } else {
    const token = typeof flags.token === 'string' ? flags.token : undefined
    const userId = typeof flags.userId === 'string' ? flags.userId : undefined

    const verificationResult = await fetch(normalizeUrl(url, '/api/v1/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token ?? '',
        'X-User-Id': userId ?? '',
      },
    }).then(async (res) => (await res.json()) as AuthResponse)

    if (!verificationResult.success) {
      throw new Error('Invalid API token')
    }

    authResult = {data: {authToken: token ?? '', userId: userId ?? ''}}
  }

  if (await checkUpload(flags, fd)) {
    process.stdout.write(`${chalk.bold.greenBright('   App already exists - updating it.')}\n`)
    flags.update = true
  }

  let endpoint = '/api/apps'
  if (flags.update) {
    endpoint += `/${fd.info.id}`
  }

  if (!authResult.data) {
    throw new Error('Invalid authentication response')
  }

  const deployResult = await fetch(normalizeUrl(url, endpoint), {
    method: 'POST',
    headers: {
      'X-Auth-Token': authResult.data.authToken,
      'X-User-Id': authResult.data.userId,
    },
    body: data,
  }).then(async (res) => (await res.json()) as AuthResponse)
  if (deployResult.status === 'error') {
    throw new Error(`Unknown error occurred while deploying ${JSON.stringify(deployResult)}`)
  } else if (!deployResult.success) {
    if (deployResult.status === 'compiler_error') {
      throw new Error(`Deployment compiler errors: \n${JSON.stringify(deployResult.messages, null, 2)}`)
    }
    throw new Error(`Deployment error: ${deployResult.error ?? 'Unknown error'}`)
  }
}

// expects the `path` to start with the /
export const normalizeUrl = (url: string, path: string): string => {
  return url.replace(/\/$/, '') + path
}

export const getIgnoredFiles = async (fd: FolderDetails): Promise<Array<string>> => {
  try {
    if (await fd.doesFileExist(fd.mergeWithFolder('.rcappsconfig'))) {
      const data = await fs.readFile(fd.mergeWithFolder('.rcappsconfig'), 'utf-8')
      const parsedData = JSON.parse(data) as {ignoredFiles?: Array<string>}
      return parsedData.ignoredFiles ?? ['**/dist/**']
    } else {
      return ['**/dist/**']
    }
  } catch (e) {
    throw new Error((e as Error)?.message || String(e))
  }
}
