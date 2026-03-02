import { DeployConfig } from './types';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function loadDeployConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DeployConfig {
  return {
    url: env.RC_APPS_URL,
    username: env.RC_APPS_USERNAME,
    password: env.RC_APPS_PASSWORD,
    token: env.RC_APPS_TOKEN,
    userId: env.RC_APPS_USER_ID,
    code: env.RC_APPS_2FA_CODE,
    allowHttp: toBoolean(env.RC_APPS_ALLOW_HTTP),
  };
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return TRUE_VALUES.has(value.trim().toLowerCase());
}
