export class Logger {
  constructor(private readonly verboseEnabled: boolean) {}

  public info(message: string): void {
    console.log(message);
  }

  public warn(message: string): void {
    console.warn(message);
  }

  public error(message: string): void {
    console.error(message);
  }

  public verbose(message: string): void {
    if (this.verboseEnabled) {
      console.log(message);
    }
  }
}
