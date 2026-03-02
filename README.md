# Rocket.Chat Apps CLI (v2)

Modernized `rc-apps` CLI focused on local app development, packaging, deployment, and scaffolding.

## What Changed In v2

- Legacy implementation is preserved under `legacy/` for reference.
- Deprecated cloud/marketplace commands were removed from active CLI:
  - `login`
  - `logout`
  - `submit`
- Modern Node.js baseline (`>=22.0.0`).
- Lower runtime dependency surface using native Node APIs (`fetch`, `FormData`, `fs/promises`, `util.parseArgs`).
- Cross-platform path handling improvements (Windows-safe path normalization).

## Install

```bash
npm install -g @rocket.chat/apps-cli
```

## Commands

```bash
rc-apps help
```

```bash
rc-apps env
```

### Create App

```bash
rc-apps create [name] [--description <text>] [--author <name>] [--support <urlOrEmail>] [--homepage <url>] [--skip-install]
```

### Package App

```bash
rc-apps package [--project <path>] [--force] [--verbose] [--no-compile] [--experimental-native-compiler]
```

- `--no-compile`: package source files directly (no TypeScript compile/bundle). This is intended for manual marketplace review workflows.
- `--experimental-native-compiler`: keep compile flow but use compiler native mode.
- `--verbose`: print project path, compiler mode, and output zip path.

### Deploy App

```bash
rc-apps deploy [--project <path>] --url <server> [--allow-http] [--username <u> --password <p> | --userId <id> --token <t>]
```

### Watch + Auto Deploy

```bash
rc-apps watch [--project <path>] --url <server> [--allow-http] [auth flags] [--debounce 800]
```

### Generate Boilerplate

```bash
rc-apps generate endpoint <ClassName> [--path /route]
rc-apps generate slash-command <ClassName>
rc-apps generate setting <setting_id>
```

## Config File

You can store deployment defaults in `.rcappsconfig` inside the app folder:

```json
{
  "allowHttp": false,
  "ignoredFiles": [
    "**/dist/**",
    "**/node_modules/**"
  ]
}
```

For security, server URL and auth credentials are accepted only via CLI flags.

You can also provide credentials via environment variables:
- `RC_APPS_URL`
- `RC_APPS_USERNAME`
- `RC_APPS_PASSWORD`
- `RC_APPS_TOKEN`
- `RC_APPS_USER_ID`
- `RC_APPS_2FA_CODE`
- `RC_APPS_ALLOW_HTTP`

Precedence order is:
1. CLI flags
2. Environment variables
3. `.rcappsconfig` (safe non-secret fields only)

Security defaults:
- For non-localhost targets, `deploy`/`watch` require HTTPS.
- To explicitly allow insecure HTTP on remote hosts, pass `--allow-http`.

## Development

```bash
npm install
npm run build
npm test
```

## Testing Checklist

1. `npm run build` succeeds.
2. `npm test` succeeds.
3. On Windows, run `rc-apps package` inside a valid app and confirm zip generation in `dist/`.
4. Verify `deploy` with both auth modes:
   - username/password
   - userId/token
5. Verify `watch` redeploys after editing a `.ts` source file.
