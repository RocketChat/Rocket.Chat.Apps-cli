#!/usr/bin/env node

import { CliError } from './core/errors';
import { Command } from './core/types';
import { renderCommandHelp, renderHelp } from './commands/help';
import { failure } from './utils/output';

interface CommandEntry {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  details?: string[];
  load: () => Promise<Command>;
}

const COMMANDS: CommandEntry[] = [
  {
    name: 'create',
    description: 'Create a new Rocket.Chat app project.',
    usage:
      'rc-apps create [name] [--description <text>] [--author <name>] [--support <urlOrEmail>] [--homepage <url>] [--skip-install]',
    load: async () => (await import('./commands/create')).createCommand,
  },
  {
    name: 'deploy',
    description: 'Compile, package, and deploy an app to Rocket.Chat.',
    usage:
      'rc-apps deploy [--project <path>] --url <server> [--allow-http] [--legacy-compiler] [--username <u> --password <p> | --userId <id> --token <t>]',
    details: [
      'Auth/URL can come from environment variables.',
      'Run `rc-apps env` to list all supported variables.',
      'Compiler default is native in v2. Use `--legacy-compiler` to opt into legacy mode.',
    ],
    load: async () => (await import('./commands/deploy')).deployCommand,
  },
  {
    name: 'env',
    aliases: ['config-env'],
    description: 'Show supported deploy/watch environment variables.',
    usage: 'rc-apps env',
    details: [
      'Environment variables:',
      '  RC_APPS_URL, RC_APPS_USERNAME, RC_APPS_PASSWORD, RC_APPS_TOKEN, RC_APPS_USER_ID, RC_APPS_2FA_CODE, RC_APPS_ALLOW_HTTP',
      'Precedence: CLI flags > environment variables > .rcappsconfig',
    ],
    load: async () => (await import('./commands/env')).envCommand,
  },
  {
    name: 'generate',
    aliases: ['g'],
    description: 'Generate boilerplate for app extensions.',
    usage: 'rc-apps generate <endpoint|slash-command|setting> [name] [--path <route>] [--project <path>]',
    load: async () => (await import('./commands/generate')).generateCommand,
  },
  {
    name: 'package',
    aliases: ['p', 'pack'],
    description: 'Package an app into a deployable zip file.',
    usage:
      'rc-apps package [--project <path>] [--force] [--verbose] [--no-compile] [--legacy-compiler]',
    details: ['Compiler default is native in v2. Use `--legacy-compiler` to opt into legacy mode.'],
    load: async () => (await import('./commands/package')).packageCommand,
  },
  {
    name: 'watch',
    description: 'Watch app files and deploy on changes.',
    usage: 'rc-apps watch [--project <path>] --url <server> [--allow-http] [--legacy-compiler] [auth options]',
    details: [
      'Auth/URL can come from environment variables.',
      'Run `rc-apps env` to list all supported variables.',
      'Compiler default is native in v2. Use `--legacy-compiler` to opt into legacy mode.',
    ],
    load: async () => (await import('./commands/watch')).watchCommand,
  },
];

const COMMAND_INDEX = new Map<string, CommandEntry>();
for (const command of COMMANDS) {
  COMMAND_INDEX.set(command.name, command);
  for (const alias of command.aliases ?? []) {
    COMMAND_INDEX.set(alias, command);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const requestedCommand = argv[0];

  if (!requestedCommand || requestedCommand === 'help' || requestedCommand === '--help' || requestedCommand === '-h') {
    const requestedSubCommand = argv[1];

    if (requestedSubCommand) {
      const command = COMMAND_INDEX.get(requestedSubCommand);

      if (!command) {
        throw new CliError(`Unknown command: ${requestedSubCommand}`, 2);
      }

      console.log(renderCommandHelp(command));
      return;
    }

    console.log(renderHelp(COMMANDS));
    return;
  }

  if (requestedCommand === '--version' || requestedCommand === '-v') {
    console.log('2.0.0');
    return;
  }

  const command = COMMAND_INDEX.get(requestedCommand);

  if (!command) {
    throw new CliError(`Unknown command: ${requestedCommand}. Run "rc-apps help".`, 2);
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(renderCommandHelp(command));
    return;
  }

  const args = argv.slice(1);
  const loadedCommand = await command.load();

  await loadedCommand.run(args, {
    cwd: process.cwd(),
  });
}

main().catch((error: unknown) => {
  if (error instanceof CliError) {
    failure(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    failure(error.message);
  } else {
    failure(String(error));
  }

  process.exit(1);
});
