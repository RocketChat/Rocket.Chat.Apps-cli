declare module 'conf' {
  export interface ConfOptions {
    projectName?: string
    encryptionKey?: string
  }

  export default class Conf<T extends Record<string, unknown> = Record<string, unknown>> {
    constructor(options?: Readonly<ConfOptions>)
    get<Key extends keyof T>(key: Key): T[Key]
    get(key: string): unknown
    set<Key extends keyof T>(key: Key, value: T[Key]): void
    set(key: string, value: unknown): void
    has<Key extends keyof T>(key: Key): boolean
    has(key: string): boolean
    delete<Key extends keyof T>(key: Key): void
    delete(key: string): void
  }
}
