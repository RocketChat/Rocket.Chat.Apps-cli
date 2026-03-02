declare module 'util' {
  export function parseArgs(config: any): {
    values: Record<string, any>;
    positionals: string[];
  };
}

declare module 'crypto' {
  export function randomUUID(): string;
}

declare module 'module' {
  class Module {}

  namespace Module {
    function createRequire(path: string): NodeRequire;
  }

  export = Module;
}

declare module 'fs/promises' {
  export function access(path: string): Promise<void>;
  export function stat(path: string): Promise<any>;
  export function readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  export function writeFile(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void>;
  export function mkdir(path: string, options?: any): Promise<void>;
  export function readdir(path: string, options?: any): Promise<any[]>;
}
