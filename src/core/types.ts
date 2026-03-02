export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  run(args: string[], context: CommandContext): Promise<void>;
}

export interface CommandContext {
  cwd: string;
}

export interface AppAuthor {
  name: string;
  support: string;
  homepage?: string;
}

export interface AppManifest {
  id: string;
  name: string;
  nameSlug: string;
  version: string;
  requiredApiVersion: string;
  description: string;
  author: AppAuthor;
  classFile: string;
  iconFile: string;
  permissions?: unknown;
}

export interface DeployConfig {
  url?: string;
  username?: string;
  password?: string;
  token?: string;
  userId?: string;
  code?: string;
  update?: boolean;
  ignoredFiles?: string[];
}
