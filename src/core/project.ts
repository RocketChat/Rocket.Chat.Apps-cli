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

  try {
    const fileInfo = await stat(classFilePath);
    if (!fileInfo.isFile()) {
      throw new CliError(`The classFile path is not a file: ${classFilePath}`, 2);
    }
  } catch {
    throw new CliError(`The classFile does not exist: ${classFilePath}`, 2);
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

export async function loadConfigFile(projectPath: string): Promise<DeployConfig> {
  const configPath = path.join(projectPath, '.rcappsconfig');

  try {
    const raw = await readFile(configPath, 'utf8');
    return JSON.parse(raw) as DeployConfig;
  } catch {
    return {};
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
