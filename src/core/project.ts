import { access, readFile, stat } from 'fs/promises';
import path from 'path';

import { CliError } from './errors';
import { AppManifest, DeployConfig } from './types';
import { readJsonFile } from '../utils/files';

export interface ProjectContext {
  rootPath: string;
  appJsonPath: string;
  manifest: AppManifest;
}

export interface ConfigLoadResult {
  config: DeployConfig;
  legacyFields: string[];
}

const REQUIRED_FIELDS: Array<keyof AppManifest> = [
  'id',
  'name',
  'nameSlug',
  'version',
  'requiredApiVersion',
  'description',
  'author',
  'classFile',
  'iconFile',
];

export async function loadProject(projectPath: string): Promise<ProjectContext> {
  const rootPath = path.resolve(projectPath);
  const appJsonPath = path.join(rootPath, 'app.json');

  try {
    await access(appJsonPath);
  } catch {
    throw new CliError(`No app found in ${rootPath}. Missing app.json.`, 2);
  }

  let manifest: AppManifest;

  try {
    manifest = await readJsonFile<AppManifest>(appJsonPath);
  } catch {
    throw new CliError('app.json is not valid JSON.', 2);
  }

  validateManifest(manifest);

  const classFilePath = path.resolve(rootPath, manifest.classFile);

  let fileInfo: Awaited<ReturnType<typeof stat>>;

  try {
    fileInfo = await stat(classFilePath);
  } catch {
    throw new CliError(`The classFile does not exist: ${classFilePath}`, 2);
  }

  if (!fileInfo.isFile()) {
    throw new CliError(`The classFile path is not a file: ${classFilePath}`, 2);
  }

  return {
    rootPath,
    appJsonPath,
    manifest,
  };
}

function validateManifest(manifest: AppManifest): void {
  for (const field of REQUIRED_FIELDS) {
    if (typeof manifest[field] === 'undefined' || manifest[field] === null || manifest[field] === '') {
      throw new CliError(`Invalid app.json. Missing required field: ${field}`, 2);
    }
  }

  if (!manifest.author || typeof manifest.author.name !== 'string' || typeof manifest.author.support !== 'string') {
    throw new CliError('Invalid app.json. author.name and author.support are required.', 2);
  }
}

const LEGACY_CONFIG_FIELDS = ['url', 'username', 'password', 'token', 'userId', 'code'] as const;

export async function loadConfigFile(projectPath: string): Promise<ConfigLoadResult> {
  const configPath = path.join(projectPath, '.rcappsconfig');

  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DeployConfig>;
    return {
      config: {
        allowHttp: parsed.allowHttp,
        ignoredFiles: Array.isArray(parsed.ignoredFiles) ? parsed.ignoredFiles : undefined,
      },
      legacyFields: LEGACY_CONFIG_FIELDS.filter((field) =>
        Object.prototype.hasOwnProperty.call(parsed, field) && typeof parsed[field] !== 'undefined'
      ),
    };
  } catch {
    return {
      config: {},
      legacyFields: [],
    };
  }
}

export function mergeDeployConfig(base: DeployConfig, override: DeployConfig): DeployConfig {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => typeof value !== 'undefined' && value !== '')
    ),
  };
}
