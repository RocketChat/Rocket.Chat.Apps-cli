import {Request, Server} from '@hapi/hapi'
import axios, {isAxiosError} from 'axios'
import chalk from 'chalk'
import Conf from 'conf'
import {createHash, randomUUID} from 'crypto'
import open from 'open'
import {cpu, mem, osInfo, system} from 'systeminformation'

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

type CloudConfig = {
  rcc?: ICloudAuthStorage
  'rcc.token.access_token'?: string
  'rcc.token.expires_in'?: number
  'rcc.token.scope'?: string
  'rcc.token.token_type'?: string
  'rcc.token.refresh_token'?: string
  'rcc.expiresAt'?: Date
}

export class CloudAuth {
  private config?: Conf<CloudConfig>
  private codeVerifier: string
  private readonly port = 3005
  private server?: Server
  private readonly redirectUri: string

  constructor() {
    this.redirectUri = `http://localhost:${this.port}/callback`
    this.codeVerifier = randomUUID() + randomUUID()
  }

  public async executeAuthFlow(): Promise<string> {
    await this.initialize()

    return new Promise<string>((resolve, reject) => {
      try {
        this.server = new Server({host: 'localhost', port: this.port})
        this.server.route({
          method: 'GET',
          path: '/callback',
          handler: async (request: Request) => {
            try {
              const {code} = request.query as {code?: string | string[]}
              const token = await this.fetchToken(code)

              resolve(token.access_token)
              return 'Thank you. You can close this tab.'
            } catch (err) {
              reject(err)
              return 'Error occurred. Please close this tab.'
            } finally {
              await this.server?.stop()
            }
          },
        })

        const codeChallenge = this.base64url(createHash('sha256').update(this.codeVerifier).digest('base64'))
        const authorizeUrl = this.buildAuthorizeUrl(codeChallenge)
        this.logInfo(
          `${chalk.green('*')} ${chalk.white('...if your browser does not open, open this:')} ${chalk.underline(chalk.blue(authorizeUrl))}`,
        )

        ;(async () => {
          await open(authorizeUrl)
          await this.server?.start()
        })().catch(reject)
      } catch (e) {
        this.logError(`Error inside of the execute: ${this.formatError(e)}`)
        reject(e)
      }
    })
  }

  public async hasToken(): Promise<boolean> {
    await this.initialize()

    return this.getConfig().has('rcc.token.access_token')
  }

  public async getToken(): Promise<string> {
    await this.initialize()

    const item = this.getConfig().get('rcc')
    if (!item) {
      // when there isn't an item, we will not return anything or error out
      return ''
    }

    if (new Date() < new Date(item.expiresAt)) {
      return item.token.access_token
    }

    await this.refreshToken()

    const refreshedToken = this.getConfig().get('rcc.token.access_token')
    return typeof refreshedToken === 'string' ? refreshedToken : ''
  }

  public async revokeToken(): Promise<void> {
    await this.initialize()

    const item = this.getConfig().get('rcc')
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

      const res = await axios.post<ICloudToken>(
        `${cloudUrl}/api/oauth/token`,
        new URLSearchParams(request).toString(),
        {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        },
      )
      const tokenInfo = res.data

      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in)

      const storageItem: ICloudAuthStorage = {
        token: tokenInfo,
        expiresAt,
      }

      this.getConfig().set('rcc', storageItem)

      return tokenInfo
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const {status, data} = err.response
        const errorMessage = (data as {error?: string; requestId?: string}) || {}
        this.logError(
          `[${status}] error getting token: ${errorMessage.error ?? 'unknown'} (${errorMessage.requestId ?? 'n/a'})`,
        )
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
      const res = await axios.post<ICloudToken>(
        `${cloudUrl}/api/oauth/token`,
        new URLSearchParams(request).toString(),
        {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        },
      )
      const tokenInfo = res.data

      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenInfo.expires_in)

      const config = this.getConfig()
      config.set('rcc.token.access_token', tokenInfo.access_token)
      config.set('rcc.token.expires_in', tokenInfo.expires_in)
      config.set('rcc.token.scope', tokenInfo.scope)
      config.set('rcc.token.token_type', tokenInfo.token_type)
      config.set('rcc.expiresAt', expiresAt)
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const {status, data} = err.response
        const errorMessage = (data as {error?: string; requestId?: string}) || {}
        this.logError(
          `[${status}] error refreshing token: ${errorMessage.error ?? 'unknown'} (${errorMessage.requestId ?? 'n/a'})`,
        )
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
      await axios.post(`${cloudUrl}/api/oauth/revoke`, new URLSearchParams(request).toString(), {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      })
      this.getConfig().delete('rcc')
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const {status, data} = err.response
        if (status === 401) {
          this.getConfig().delete('rcc')
          return
        }

        const errorMessage = (data as {error?: string; requestId?: string}) || {}
        this.logError(
          `[${status}] error revoking the token: ${errorMessage.error ?? 'unknown'} (${errorMessage.requestId ?? 'n/a'})`,
        )
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
    if (this.config) {
      return
    }

    this.config = new Conf<CloudConfig>({
      projectName: 'chat.rocket.apps-cli',
      encryptionKey: await this.getEncryptionKey(),
    })
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

  private getConfig(): Conf<CloudConfig> {
    if (!this.config) {
      throw new Error('Cloud configuration not initialized')
    }

    return this.config
  }

  private getRefreshToken(): string {
    const refreshToken = this.getConfig().get('rcc.token.refresh_token')
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
