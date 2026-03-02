import { basename } from 'path';
import { readFile } from 'fs/promises';

import { CliError } from './errors';
import { ProjectContext } from './project';
import { DeployConfig } from './types';

interface AuthInfo {
  authToken: string;
  userId: string;
}

interface ServerInfo {
  version?: string;
}

export function validateDeployCredentials(config: DeployConfig): void {
  const hasUserPass = Boolean(config.username && config.password);
  const hasTokenAuth = Boolean(config.token && config.userId);

  if (hasUserPass || hasTokenAuth) {
    return;
  }

  if (config.username && !config.password) {
    throw new CliError('Missing --password for provided --username.', 2);
  }

  if (config.password && !config.username) {
    throw new CliError('Missing --username for provided --password.', 2);
  }

  if (config.token && !config.userId) {
    throw new CliError('Missing --userId for provided --token.', 2);
  }

  if (config.userId && !config.token) {
    throw new CliError('Missing --token for provided --userId.', 2);
  }

  throw new CliError('Authentication is required. Provide --username/--password or --token/--userId.', 2);
}

export async function getServerInfo(config: DeployConfig): Promise<ServerInfo> {
  assertUrl(config.url);

  const response = await fetch(normalizeUrl(config.url!, '/api/info'));

  if (!response.ok) {
    throw new CliError(`Unable to connect to Rocket.Chat server at ${config.url}.`, 2);
  }

  return await parseJsonResponse<ServerInfo>(
    response,
    `Invalid response from ${normalizeUrl(
      config.url!,
      '/api/info',
    )}. Make sure --url points to a Rocket.Chat server root (for example: http://localhost:3000).`,
  );
}

export async function uploadApp(
  config: DeployConfig,
  project: ProjectContext,
  zipAbsolutePath: string,
): Promise<{ mode: 'create' | 'update' }> {
  assertUrl(config.url);

  const auth = await authenticate(config);
  const alreadyInstalled = await appAlreadyExists(config, auth, project.manifest.id);
  const shouldUpdate = Boolean(config.update || alreadyInstalled);

  const endpoint = shouldUpdate ? `/api/apps/${project.manifest.id}` : '/api/apps';
  const formData = await createAppUploadForm(zipAbsolutePath, project.manifest.permissions);

  const response = await fetch(normalizeUrl(config.url!, endpoint), {
    method: 'POST',
    headers: {
      'X-Auth-Token': auth.authToken,
      'X-User-Id': auth.userId,
    },
    body: formData,
  });

  const result = await parseJsonResponse<{ success?: boolean; status?: string; error?: string; messages?: unknown }>(
    response,
    `Invalid response from ${normalizeUrl(config.url!, endpoint)}.`,
  );

  if (!response.ok || result.status === 'error' || result.success === false) {
    if (result.status === 'compiler_error') {
      throw new CliError(`Deployment compiler errors: ${JSON.stringify(result.messages, null, 2)}`);
    }

    throw new CliError(result.error ?? `Deployment failed with status ${response.status}.`);
  }

  return {
    mode: shouldUpdate ? 'update' : 'create',
  };
}

export async function loadIgnoredPatterns(config: DeployConfig): Promise<string[]> {
  const defaults = ['**/dist/**', '**/node_modules/**', '**/.git/**'];

  if (!config.ignoredFiles || config.ignoredFiles.length === 0) {
    return defaults;
  }

  return Array.from(new Set([...defaults, ...config.ignoredFiles]));
}

async function authenticate(config: DeployConfig): Promise<AuthInfo> {
  if (config.token && config.userId) {
    const verification = await fetch(normalizeUrl(config.url!, '/api/v1/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': config.token,
        'X-User-Id': config.userId,
      },
    });

    const result = await parseJsonResponse<{ success?: boolean }>(
      verification,
      `Invalid response from ${normalizeUrl(config.url!, '/api/v1/me')}.`,
    );

    if (!verification.ok || !result.success) {
      throw new CliError('Invalid personal access token or userId.', 2);
    }

    return {
      authToken: config.token,
      userId: config.userId,
    };
  }

  if (!config.username || !config.password) {
    throw new CliError('Authentication is required. Provide --username/--password or --token/--userId.', 2);
  }

  const loginPayload: Record<string, string> = {
    user: config.username,
    password: config.password,
  };

  if (config.code) {
    loginPayload.code = config.code;
  }

  const response = await fetch(normalizeUrl(config.url!, '/api/v1/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginPayload),
  });

  const result = await parseJsonResponse<{
    status?: string;
    data?: { authToken: string; userId: string };
  }>(response, `Invalid response from ${normalizeUrl(config.url!, '/api/v1/login')}.`);

  if (!response.ok || result.status === 'error' || !result.data) {
    throw new CliError('Invalid username/password or missing 2FA code.', 2);
  }

  return result.data;
}

async function appAlreadyExists(config: DeployConfig, auth: AuthInfo, appId: string): Promise<boolean> {
  const response = await fetch(normalizeUrl(config.url!, `/api/apps/${appId}`), {
    method: 'GET',
    headers: {
      'X-Auth-Token': auth.authToken,
      'X-User-Id': auth.userId,
    },
  });

  if (!response.ok) {
    return false;
  }

  const body = await parseJsonResponse<{ success?: boolean }>(
    response,
    `Invalid response from ${normalizeUrl(config.url!, `/api/apps/${appId}`)}.`,
  );
  return Boolean(body.success);
}

async function createAppUploadForm(zipAbsolutePath: string, permissions?: unknown): Promise<FormData> {
  const form = new FormData();
  const fileContents = await readFile(zipAbsolutePath);
  const fileBlob = new Blob([fileContents], { type: 'application/zip' });

  form.set('app', fileBlob, basename(zipAbsolutePath));

  if (permissions) {
    form.set('permissions', JSON.stringify(permissions));
  }

  return form;
}

function assertUrl(url: string | undefined): asserts url is string {
  if (!url) {
    throw new CliError('Missing server URL. Provide --url or set it in .rcappsconfig.', 2);
  }
}

function normalizeUrl(url: string, endpoint: string): string {
  return `${url.replace(/\/$/, '')}${endpoint}`;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const raw = await response.text();

  try {
    return JSON.parse(raw) as T;
  } catch {
    const snippet = raw.trim().slice(0, 120).replace(/\s+/g, ' ');
    const contentType = response.headers.get('content-type') ?? 'unknown';
    throw new CliError(`${fallbackMessage} Received non-JSON response (content-type: ${contentType}): ${snippet}`, 2);
  }
}
