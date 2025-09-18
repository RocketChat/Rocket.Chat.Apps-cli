export class DiagnosticReport {
  private _options = 0
  private _syntactic = 0
  private _global = 0
  private _semantic = 0
  private _declaration = 0
  private _emit = 0
  private _isValid: boolean

  constructor() {
    this._isValid = true
  }

  public get isValid(): boolean {
    return this._isValid
  }

  public set options(count: number) {
    this._options = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get options(): number {
    return this._options
  }

  public set syntactic(count: number) {
    this._syntactic = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get syntactic(): number {
    return this._syntactic
  }

  public set global(count: number) {
    this._global = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get global(): number {
    return this._global
  }

  public set semantic(count: number) {
    this._semantic = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get semantic(): number {
    return this._semantic
  }

  public set declaration(count: number) {
    this._declaration = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get declaration(): number {
    return this._declaration
  }

  public set emit(count: number) {
    this._emit = count

    if (count > 0) {
      this._isValid = false
    }
  }

  public get emit(): number {
    return this._emit
  }
}
