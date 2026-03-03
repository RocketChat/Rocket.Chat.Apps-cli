const test = require('node:test');
const assert = require('node:assert/strict');

const { loadDeployConfigFromEnv } = require('../lib/core/env.js');

test('loadDeployConfigFromEnv maps RC_APPS vars', () => {
  const config = loadDeployConfigFromEnv({
    RC_APPS_URL: 'https://chat.example.com',
    RC_APPS_USERNAME: 'user',
    RC_APPS_PASSWORD: 'pass',
    RC_APPS_TOKEN: 'token',
    RC_APPS_USER_ID: 'uid',
    RC_APPS_2FA_CODE: '123456',
    RC_APPS_ALLOW_HTTP: 'true',
  });

  assert.equal(config.url, 'https://chat.example.com');
  assert.equal(config.username, 'user');
  assert.equal(config.password, 'pass');
  assert.equal(config.token, 'token');
  assert.equal(config.userId, 'uid');
  assert.equal(config.code, '123456');
  assert.equal(config.allowHttp, true);
});

test('loadDeployConfigFromEnv handles falsey allow-http', () => {
  const config = loadDeployConfigFromEnv({ RC_APPS_ALLOW_HTTP: 'false' });
  assert.equal(config.allowHttp, false);
});

test('loadDeployConfigFromEnv keeps allow-http undefined when not set', () => {
  const config = loadDeployConfigFromEnv({});
  assert.equal(typeof config.allowHttp, 'undefined');
});
