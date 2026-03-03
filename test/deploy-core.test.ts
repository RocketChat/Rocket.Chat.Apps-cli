const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { writeFile } = require('node:fs/promises');

const {
  getServerInfo,
  loadIgnoredPatterns,
  uploadApp,
  validateDeployCredentials,
} = require('../lib/core/deploy.js');
const { CliError } = require('../lib/core/errors.js');
const { createTempDir, patch, removeTempDir } = require('./helpers.ts');

interface FetchOptionsLike {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('validateDeployCredentials accepts supported auth combinations', () => {
  validateDeployCredentials({ username: 'u', password: 'p' });
  validateDeployCredentials({ token: 't', userId: 'id' });
});

test('validateDeployCredentials rejects incomplete auth combinations', () => {
  assert.throws(() => validateDeployCredentials({ username: 'u' }), /Missing --password/);
  assert.throws(() => validateDeployCredentials({ password: 'p' }), /Missing --username/);
  assert.throws(() => validateDeployCredentials({ token: 't' }), /Missing --userId/);
  assert.throws(() => validateDeployCredentials({ userId: 'id' }), /Missing --token/);
  assert.throws(() => validateDeployCredentials({}), /Authentication is required/);
});

test('getServerInfo validates URL constraints', async () => {
  await assert.rejects(() => getServerInfo({}), /Missing server URL/);
  await assert.rejects(() => getServerInfo({ url: 'not-a-url' }), /Invalid URL/);
  await assert.rejects(() => getServerInfo({ url: 'ftp://example.com' }), /protocol must be http or https/);
  await assert.rejects(
    () => getServerInfo({ url: 'https://user:pass@example.com' }),
    /Credentials in URL are not supported/,
  );
  await assert.rejects(() => getServerInfo({ url: 'https://example.com?a=1' }), /must not include query string or hash/);
  await assert.rejects(
    () => getServerInfo({ url: 'http://example.com' }),
    /Refusing insecure HTTP for non-localhost target/,
  );
});

test('getServerInfo handles successful and invalid responses', async () => {
  const restoreFetch = patch(global, 'fetch', async (url: unknown) => {
    if (String(url).endsWith('/api/info')) {
      return jsonResponse({ version: '8.1' });
    }
    throw new Error('unexpected url');
  });

  try {
    const info = await getServerInfo({ url: 'http://localhost:3000' });
    assert.equal(info.version, '8.1');
  } finally {
    restoreFetch();
  }

  const restoreNonJson = patch(global, 'fetch', async () =>
    new Response('<!DOCTYPE html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  );

  try {
    await assert.rejects(
      () => getServerInfo({ url: 'http://localhost:3000' }),
      /Received non-JSON response \(content-type: text\/html\)/,
    );
  } finally {
    restoreNonJson();
  }

  const restoreNotOk = patch(global, 'fetch', async () => jsonResponse({ ok: false }, 500));

  try {
    await assert.rejects(() => getServerInfo({ url: 'http://localhost:3000' }), /Unable to connect to Rocket.Chat server/);
  } finally {
    restoreNotOk();
  }
});

test('uploadApp deploys via token auth and creates app when not installed', async () => {
  const root = await createTempDir();
  const zipPath = path.join(root, 'app.zip');
  await writeFile(zipPath, 'zip-content', 'utf8');

  const calls: Array<{ url: string; options: FetchOptionsLike }> = [];
  const restoreFetch = patch(global, 'fetch', async (url: unknown, options: FetchOptionsLike = {}) => {
    calls.push({ url: String(url), options });

    if (String(url).endsWith('/api/v1/me')) {
      return jsonResponse({ success: true });
    }
    if (String(url).endsWith('/api/apps/app.id')) {
      return jsonResponse({ success: false }, 404);
    }
    if (String(url).endsWith('/api/apps')) {
      return jsonResponse({ success: true, status: 'ok' });
    }

    throw new Error(`unexpected url: ${String(url)}`);
  });

  try {
    const result = await uploadApp(
      { url: 'http://localhost:3000', token: 'token', userId: 'uid' },
      { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
      zipPath,
    );

    assert.equal(result.mode, 'create');
    const firstCall = calls[0];
    const uploadCall = calls[2];
    assert.ok(firstCall);
    assert.ok(uploadCall);
    assert.equal(firstCall.options.method, 'GET');
    assert.equal(uploadCall.options.method, 'POST');
    assert.equal(uploadCall.options.headers?.['X-Auth-Token'], 'token');
  } finally {
    restoreFetch();
    await removeTempDir(root);
  }
});

test('uploadApp deploys via username/password and updates existing app', async () => {
  const root = await createTempDir();
  const zipPath = path.join(root, 'app.zip');
  await writeFile(zipPath, 'zip-content', 'utf8');

  const seenBodies: unknown[] = [];
  const restoreFetch = patch(global, 'fetch', async (url: unknown, options: FetchOptionsLike = {}) => {
    const target = String(url);

    if (target.endsWith('/api/v1/login')) {
      seenBodies.push(options.body);
      return jsonResponse({
        status: 'success',
        data: { authToken: 'authed', userId: 'u1' },
      });
    }
    if (target.endsWith('/api/apps/app.id')) {
      if (options.method === 'GET') {
        return jsonResponse({ success: true });
      }
      return jsonResponse({ success: true, status: 'ok' });
    }

    throw new Error(`unexpected url: ${target}`);
  });

  try {
    const result = await uploadApp(
      { url: 'http://localhost:3000', username: 'user', password: 'pass', code: '222' },
      {
        rootPath: root,
        appJsonPath: '',
        manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0', permissions: { x: true } },
      },
      zipPath,
    );

    assert.equal(result.mode, 'update');
    assert.equal(String(seenBodies[0]).includes('"code":"222"'), true);
  } finally {
    restoreFetch();
    await removeTempDir(root);
  }
});

test('uploadApp surfaces auth and deployment failures', async () => {
  const root = await createTempDir();
  const zipPath = path.join(root, 'app.zip');
  await writeFile(zipPath, 'zip-content', 'utf8');

  const restoreInvalidToken = patch(global, 'fetch', async (url: unknown) => {
    if (String(url).endsWith('/api/v1/me')) {
      return jsonResponse({ success: false }, 401);
    }
    throw new Error('unexpected');
  });

  try {
    await assert.rejects(
      () =>
        uploadApp(
          { url: 'http://localhost:3000', token: 'bad', userId: 'uid' },
          { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
          zipPath,
        ),
      /Invalid personal access token or userId/,
    );
  } finally {
    restoreInvalidToken();
  }

  const restoreCompilerError = patch(global, 'fetch', async (url: unknown, options: FetchOptionsLike = {}) => {
    const target = String(url);
    if (target.endsWith('/api/v1/login')) {
      return jsonResponse({ status: 'success', data: { authToken: 'ok', userId: 'id' } });
    }
    if (target.endsWith('/api/apps/app.id') && options.method === 'GET') {
      return jsonResponse({ success: true });
    }
    if (target.endsWith('/api/apps/app.id') && options.method === 'POST') {
      return jsonResponse({ status: 'compiler_error', messages: [{ msg: 'bad' }] }, 400);
    }
    throw new Error('unexpected');
  });

  try {
    await assert.rejects(
      () =>
        uploadApp(
          { url: 'http://localhost:3000', username: 'user', password: 'pass' },
          { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
          zipPath,
        ),
      /Deployment compiler errors/,
    );
  } finally {
    restoreCompilerError();
  }

  const restoreDeploymentError = patch(global, 'fetch', async (url: unknown, options: FetchOptionsLike = {}) => {
    const target = String(url);
    if (target.endsWith('/api/v1/login')) {
      return jsonResponse({ status: 'success', data: { authToken: 'ok', userId: 'id' } });
    }
    if (target.endsWith('/api/apps/app.id') && options.method === 'GET') {
      return jsonResponse({ success: true });
    }
    if (target.endsWith('/api/apps/app.id') && options.method === 'POST') {
      return jsonResponse({ status: 'error', error: 'deploy failed' }, 500);
    }
    throw new Error('unexpected');
  });

  try {
    await assert.rejects(
      () =>
        uploadApp(
          { url: 'http://localhost:3000', username: 'user', password: 'pass' },
          { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
          zipPath,
        ),
      /deploy failed/,
    );
  } finally {
    restoreDeploymentError();
    await removeTempDir(root);
  }
});

test('uploadApp rejects invalid username/password login', async () => {
  const root = await createTempDir();
  const zipPath = path.join(root, 'app.zip');
  await writeFile(zipPath, 'zip-content', 'utf8');

  const restoreFetch = patch(global, 'fetch', async (url: unknown) => {
    if (String(url).endsWith('/api/v1/login')) {
      return jsonResponse({ status: 'error' }, 401);
    }
    throw new Error('unexpected');
  });

  try {
    await assert.rejects(
      () =>
        uploadApp(
          { url: 'http://localhost:3000', username: 'u', password: 'p' },
          { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
          zipPath,
        ),
      /Invalid username\/password or missing 2FA code/,
    );
  } finally {
    restoreFetch();
    await removeTempDir(root);
  }
});

test('uploadApp requires username and password for login flow', async () => {
  const root = await createTempDir();
  const zipPath = path.join(root, 'app.zip');
  await writeFile(zipPath, 'zip-content', 'utf8');

  try {
    await assert.rejects(
      () =>
        uploadApp(
          { url: 'http://localhost:3000', username: 'user' },
          { rootPath: root, appJsonPath: '', manifest: { id: 'app.id', nameSlug: 'app', version: '1.0.0' } },
          zipPath,
        ),
      /Authentication is required/,
    );
  } finally {
    await removeTempDir(root);
  }
});

test('loadIgnoredPatterns adds defaults and de-duplicates custom patterns', async () => {
  const defaults = await loadIgnoredPatterns({});
  assert.equal(defaults.includes('**/dist/**'), true);

  const merged = await loadIgnoredPatterns({
    ignoredFiles: ['**/custom/**', '**/dist/**'],
  });
  assert.equal(merged.includes('**/custom/**'), true);
  assert.equal(merged.filter((item: string) => item === '**/dist/**').length, 1);
});
