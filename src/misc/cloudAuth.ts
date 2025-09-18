import {createServer} from 'http'
import type {Server as HttpServer} from 'http'
import chalk from 'chalk'
import {createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID} from 'crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import * as os from 'os'
import * as path from 'path'
import {cpu, mem, osInfo, system} from 'systeminformation'

import {openExternal} from './openExternal'

const cloudUrl = 'https://cloud.rocket.chat'
const clientId = '5d8e59c5d48080ef5497e522'
const scope = 'offline_access marketplace:app-submit'

export interface ICloudToken {
  access_token: string
  expires_in: number
  scope: string
  refresh_token: string
  token_type: string
}

export interface ICloudAuthStorage {
  token: ICloudToken
  expiresAt: Date
}

class CloudAuthRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Request failed with status ${status}`)
  }
}

const resolveStorePath = (): string => {
  if (process.env.RC_APPS_CONFIG_PATH) {
    return process.env.RC_APPS_CONFIG_PATH
  }

  if (process.platform === 'win32') {
    const base = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'rc-apps', 'cloud-auth.json')
  }

  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config')
  return path.join(configHome, 'rc-apps', 'cloud-auth.json')
}

class CloudConfigStore {
  private cache: Record<string, unknown>

  constructor(private filePath: string, private secret: Buffer) {
    this.cache = this.readFromDisk()
  }

  public get<T>(key: string): T | undefined {
    const value = this.cache[key]

    if (key === 'rcc' && value && typeof value === 'object') {
      const storage = {...(value as Record<string, unknown>)}
      if (typeof storage.expiresAt === 'string') {
        storage.expiresAt = new Date(storage.expiresAt)
      }

      return storage as T
    }

    if (key === 'rcc.expiresAt' && typeof value === 'string') {
      return new Date(value) as T
    }

    return value as T | undefined
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.cache, key)
  }

  public set(key: string, value: unknown): void {
    if (value instanceof Date) {
      this.cache[key] = value.toISOString()
    } else if (key === 'rcc' && value && typeof value === 'object') {
      const storage = {...(value as Record<string, unknown>)}
      if (storage.expiresAt instanceof Date) {
        storage.expiresAt = storage.expiresAt.toISOString()
      }
      this.cache[key] = storage
    } else {
      this.cache[key] = value
    }

    this.writeToDisk()
  }

  public delete(key: string): void {
    if (this.has(key)) {
      delete this.cache[key]
      this.writeToDisk()
    }
  }

  private readFromDisk(): Record<string, unknown> {
    if (!existsSync(this.filePath)) {
      return {}
    }

    try {
      const raw = readFileSync(this.filePath, 'utf8')
      if (!raw) {
        return {}
      }

      const buffer = Buffer.from(raw, 'base64')
      const iv = buffer.subarray(0, 12)
      const authTag = buffer.subarray(12, 28)
      const ciphertext = buffer.subarray(28)

      const decipher = createDecipheriv('aes-256-gcm', this.secret, iv)
      decipher.setAuthTag(authTag)
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
      return JSON.parse(decrypted) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  private writeToDisk(): void {
    try {
      const dir = path.dirname(this.filePath)
      mkdirSync(dir, {recursive: true})

      const plaintext = Buffer.from(JSON.stringify(this.cache), 'utf8')
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', this.secret, iv)
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
      const authTag = cipher.getAuthTag()
      const payload = Buffer.concat([iv, authTag, ciphertext]).toString('base64')

      writeFileSync(this.filePath, payload, {mode: 0o600})
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist cloud auth configuration:', error)
    }
  }
}

export class CloudAuth {
  private store?: CloudConfigStore
  private codeVerifier: string
  private readonly port = 3005
  private server?: HttpServer
  private readonly redirectUri: string

  constructor() {
    this.redirectUri = `http://localhost:${this.port}/callback`
    this.codeVerifier = randomUUID() + randomUUID()
  }

  public async executeAuthFlow(): Promise<string> {
    await this.initialize()

    return new Promise<string>((resolve, reject) => {
      let settled = false
      const safeResolve = (value: string) => {
        if (!settled) {
          settled = true
          resolve(value)
        }
      }
      const safeReject = (error: unknown) => {
        if (!settled) {
          settled = true
          reject(error)
        }
      }

      try {
        this.server = createServer(async (req, res) => {
          if (!req.url) {
            res.statusCode = 400
            res.end('Invalid request')
            return
          }

          const requestUrl = new URL(req.url, this.redirectUri)

          if (requestUrl.pathname !== '/callback') {
            res.statusCode = 404
            res.end('Not Found')
            return
          }

          try {
            const code = requestUrl.searchParams.get('code')
            const token = await this.fetchToken(code ?? undefined)

            res.statusCode = 200
            res.end('Thank you. You can close this tab.')
            safeResolve(token.access_token)
          } catch (err) {
            res.statusCode = 500
            res.end('Error occurred. Please close this tab.')
            safeReject(err)
          } finally {
            await this.stopServer()
          }
        })

        this.server.on('error', (error) => {
          this.logError(`Callback server error: ${this.formatError(error)}`)
          safeReject(error)
        })

        this.server.listen(this.port, 'localhost', async () => {
          try {
            const codeChallenge = this.base64url(createHash('sha256').update(this.codeVerifier).digest('base64'))
            const authorizeUrl = this.buildAuthorizeUrl(codeChallenge)
            this.logInfo(
              `${chalk.green('*')} ${chalk.white('...if your browser does not open, open this:')} ${chalk.underline(chalk.blue(authorizeUrl))}`,
            )

            await openExternal(authorizeUrl)
          } catch (err) {
            this.logError(`Error launching browser: ${this.formatError(err)}`)
            await this.stopServer()
            safeReject(err)
          }
        })
      } catch (e) {
        this.logError(`Error inside of the execute: ${this.formatError(e)}`)
        void this.stopServer()
        safeReject(e)
      }
    })
  }

  public async hasToken(): Promise<boolean> {
    await this.initialize()

    return this.getStore().has('rcc.token.access_token')
  }

  public async getToken(): Promise<string> {
    await this.initialize()

    const item = this.getStore().get<ICloudAuthStorage>('rcc')
    if (!item) {
      // when there isn't an item, we will not return anything or error out
      return ''
    }

    if (new Date() < new Date(item.expiresAt)) {
      return item.token.access_token
    }

    await this.refreshToken()

    const refreshedToken = this.getStore().get<string>('rcc.token.access_token')
    return typeof refreshedToken === 'string' ? refreshedToken : ''
  }

  public async revokeToken(): Promise<void> {
    await this.initialize()

    const item = this.getStore().get<ICloudAuthStorage>('rcc')
    if (!item) {
      throw new Error('invalid cloud auth storage item')
    }

    await this.revokeTheToken()
  }

  private async fetchToken(rawCode: string | string[] | undefined): Promise<ICloudToken> {
    try {
      const code = this.ensureCode(rawCode)
      const request = {
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        client_id: clientId,
        code,
        code_verifier: this.codeVerifier,
      }

      const tokenInfo = await this.postForm<ICloudToken>('/api/oauth/token', request)

      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in)

      const storageItem: ICloudAuthStorage = {
        token: tokenInfo,
        expiresAt,
      }

      this.getStore().set('rcc', storageItem)

      return tokenInfo
    } catch (err) {
      if (err instanceof CloudAuthRequestError) {
        this.logHttpError('error getting token', err)
      } else {
        this.logError(`Error getting token: ${this.formatError(err)}`)
      }

      throw err
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken()

    const request = {
      client_id: clientId,
      refresh_token: refreshToken,
      scope,
      grant_type: 'refresh_token',
      redirect_uri: this.redirectUri,
    }

    try {
      const tokenInfo = await this.postForm<ICloudToken>('/api/oauth/token', request)

      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in)

      const store = this.getStore()
      store.set('rcc.token.access_token', tokenInfo.access_token)
      store.set('rcc.token.expires_in', tokenInfo.expires_in)
      store.set('rcc.token.scope', tokenInfo.scope)
      store.set('rcc.token.token_type', tokenInfo.token_type)
      store.set('rcc.expiresAt', expiresAt)
    } catch (err) {
      if (err instanceof CloudAuthRequestError) {
        this.logHttpError('error refreshing token', err)
      } else {
        this.logError(`Error refreshing token: ${this.formatError(err)}`)
      }

      throw err
    }
  }

  private async revokeTheToken(): Promise<void> {
    const refreshToken = this.getRefreshToken()

    const request = {
      client_id: clientId,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }

    try {
      await this.postForm('/api/oauth/revoke', request)
      this.getStore().delete('rcc')
    } catch (err) {
      if (err instanceof CloudAuthRequestError) {
        if (err.status === 401) {
          this.getStore().delete('rcc')
          return
        }

        this.logHttpError('error revoking the token', err)
      } else {
        this.logError(`Error revoking token: ${this.formatError(err)}`)
      }

      throw err
    }
  }

  private buildAuthorizeUrl(codeChallenge: string): string {
    const data = {
      client_id: clientId,
      response_type: 'code',
      scope,
      redirect_uri: this.redirectUri,
      state: randomUUID(),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    }

    const params = new URLSearchParams(data)
    return `${cloudUrl}/authorize?${params.toString()}`
  }

  private async initialize(): Promise<void> {
    if (this.store) {
      return
    }

    const encryptionKey = await this.getEncryptionKey()
    const keyMaterial = createHash('sha256').update(encryptionKey).digest()
    const storePath = resolveStorePath()

    this.store = new CloudConfigStore(storePath, keyMaterial)
  }

  private async getEncryptionKey(): Promise<string> {
    const s = await system()
    const c = await cpu()
    const m = await mem()
    const o = await osInfo()

    return (
      s.manufacturer +
      ';' +
      s.uuid +
      ';' +
      String(c.processors) +
      ';' +
      c.vendor +
      ';' +
      m.total +
      ';' +
      o.platform +
      ';' +
      o.release
    )
  }

  // base64url - https://base64.guru/standards/base64url
  private base64url(url: string): string {
    return url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private async postForm<T>(path: string, payload: Record<string, string>): Promise<T> {
    const response = await fetch(`${cloudUrl}${path}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(payload).toString(),
    })

    const rawBody = await response.text()
    let parsedBody: unknown = undefined

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = rawBody
      }
    }

    if (!response.ok) {
      throw new CloudAuthRequestError(response.status, parsedBody ?? rawBody)
    }

    return parsedBody as T
  }

  private logHttpError(prefix: string, err: CloudAuthRequestError): void {
    const {error, requestId} = this.extractErrorDetails(err.body)
    this.logError(`[${err.status}] ${prefix}: ${error ?? 'unknown'} (${requestId ?? 'n/a'})`)
  }

  private extractErrorDetails(body: unknown): {error?: string; requestId?: string} {
    if (body && typeof body === 'object') {
      const info = body as Record<string, unknown>
      return {
        error: typeof info.error === 'string' ? info.error : undefined,
        requestId: typeof info.requestId === 'string' ? info.requestId : undefined,
      }
    }

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        return {
          error: typeof parsed.error === 'string' ? parsed.error : undefined,
          requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined,
        }
      } catch {
        return {error: body}
      }
    }

    return {}
  }

  private async stopServer(): Promise<void> {
    if (!this.server) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }).catch((err) => this.logError(`Error stopping callback server: ${this.formatError(err)}`))

    this.server = undefined
  }

  private getStore(): CloudConfigStore {
    if (!this.store) {
      throw new Error('Cloud configuration not initialized')
    }

    return this.store
  }

  private getRefreshToken(): string {
    const refreshToken = this.getStore().get<string>('rcc.token.refresh_token')
    return typeof refreshToken === 'string' ? refreshToken : ''
  }

  private ensureCode(code: string | string[] | undefined): string {
    if (!code) {
      throw new Error('Authorization code not provided')
    }

    return Array.isArray(code) ? code[0] : code
  }

  private logInfo(message: string): void {
    process.stdout.write(`${message}\n`)
  }

  private logError(message: string): void {
    process.stderr.write(`${message}\n`)
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`
    }

    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
}
