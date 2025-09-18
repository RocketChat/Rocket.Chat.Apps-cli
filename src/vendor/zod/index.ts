/* Minimal subset of Zod used for app.json validation. */

export type ZodIssue = {
  message: string
  path: Array<string | number>
}

export class ZodError extends Error {
  public readonly issues: Array<ZodIssue>

  constructor(issues: Array<ZodIssue>) {
    super('Zod validation error')
    this.issues = issues
  }
}

type Path = Array<string | number>

interface RefinementCtx {
  addIssue: (message: string) => void
  path: ReadonlyArray<string | number>
}

type ParseResult<T> = {success: true; data: T} | {success: false; error: ZodError}

type IssueCollector = {
  add: (message: string, path: Path) => void
}

abstract class ZodType<T> {
  public declare readonly _type: T

  optional(): ZodOptional<T> {
    return new ZodOptional(this)
  }

  safeParse(value: unknown): ParseResult<T> {
    const issues: Array<ZodIssue> = []
    const collector: IssueCollector = {
      add: (message: string, path: Path) => {
        issues.push({message, path})
      },
    }

    const data = this._parse(value, collector, [])
    if (issues.length) {
      return {success: false, error: new ZodError(issues)}
    }

    return {success: true, data}
  }

  protected abstract _parse(value: unknown, collector: IssueCollector, path: Path): T

  protected parseChild<Out>(schema: ZodType<Out>, value: unknown, collector: IssueCollector, path: Path): Out {
    return schema._parse(value, collector, path)
  }
}

type StringCheck =
  | {kind: 'min'; value: number; message?: string}
  | {kind: 'regex'; regex: RegExp; message?: string}
  | {kind: 'refine'; check: (value: string) => boolean; message?: string}

class ZodString extends ZodType<string> {
  private readonly checks: Array<StringCheck>
  private readonly superRefinements: Array<(value: string, ctx: RefinementCtx) => void>

  constructor(
    checks: Array<StringCheck> = [],
    superRefinements: Array<(value: string, ctx: RefinementCtx) => void> = [],
  ) {
    super()
    this.checks = checks
    this.superRefinements = superRefinements
  }

  min(length: number, message?: string): ZodString {
    return new ZodString([...this.checks, {kind: 'min', value: length, message}], [...this.superRefinements])
  }

  regex(regex: RegExp, message?: string): ZodString {
    return new ZodString([...this.checks, {kind: 'regex', regex, message}], [...this.superRefinements])
  }

  refine(check: (value: string) => boolean, options?: {message?: string}): ZodString {
    return new ZodString(
      [...this.checks, {kind: 'refine', check, message: options?.message}],
      [...this.superRefinements],
    )
  }

  url(message = 'Invalid URL'): ZodString {
    return this.refine((value) => URL.canParse(value), {message})
  }

  superRefine(check: (value: string, ctx: RefinementCtx) => void): ZodString {
    return new ZodString([...this.checks], [...this.superRefinements, check])
  }

  protected _parse(value: unknown, collector: IssueCollector, path: Path): string {
    if (typeof value !== 'string') {
      collector.add('Expected string', [...path])
      return ''
    }

    for (const check of this.checks) {
      if (check.kind === 'min' && value.length < check.value) {
        collector.add(check.message ?? `Must be at least ${check.value} characters long`, [...path])
      } else if (check.kind === 'regex' && !check.regex.test(value)) {
        collector.add(check.message ?? 'Invalid format', [...path])
      } else if (check.kind === 'refine' && !check.check(value)) {
        collector.add(check.message ?? 'Invalid value', [...path])
      }
    }

    const ctx: RefinementCtx = {
      path,
      addIssue: (message: string) => collector.add(message, [...path]),
    }

    for (const refine of this.superRefinements) {
      refine(value, ctx)
    }

    return value
  }
}

class ZodOptional<T> extends ZodType<T | undefined> {
  constructor(private readonly inner: ZodType<T>) {
    super()
  }

  protected _parse(value: unknown, collector: IssueCollector, path: Path): T | undefined {
    if (typeof value === 'undefined') {
      return undefined
    }

    return this.parseChild(this.inner, value, collector, path)
  }
}

type ZodRawShape = Record<string, ZodType<unknown>>

type ShapeOutput<S extends ZodRawShape> = {
  [K in keyof S]: S[K]['_type']
}

class ZodObject<S extends ZodRawShape> extends ZodType<ShapeOutput<S>> {
  constructor(private readonly shape: S, private readonly allowPassthrough = false) {
    super()
  }

  passthrough(): ZodObject<S> {
    return new ZodObject(this.shape, true)
  }

  protected _parse(value: unknown, collector: IssueCollector, path: Path): ShapeOutput<S> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      collector.add('Expected object', [...path])
      return {} as ShapeOutput<S>
    }

    const record = value as Record<string, unknown>
    const result: Record<string, unknown> = this.allowPassthrough ? {...record} : {}

    for (const key of Object.keys(this.shape) as Array<keyof S>) {
      const child = this.shape[key]
      const childValue = record[key as string]
      result[key as string] = this.parseChild(child, childValue, collector, [...path, key as string])
    }

    return result as ShapeOutput<S>
  }
}

export const z = {
  string: () => new ZodString(),
  object: <S extends ZodRawShape>(shape: S) => new ZodObject(shape),
}

export type infer<T extends ZodType<unknown>> = T['_type']
