#!/usr/bin/env node

import { CliError } from './core/errors';
import { Command } from './core/types';
import { renderCommandHelp, renderHelp } from './commands/help';

interface CommandEntry {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
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
      'rc-apps deploy [--project <path>] --url <server> [--username <u> --password <p> | --userId <id> --token <t>]',
    load: async () => (await import('./commands/deploy')).deployCommand,
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
      'rc-apps package [--project <path>] [--force] [--verbose] [--no-compile] [--experimental-native-compiler]',
    load: async () => (await import('./commands/package')).packageCommand,
  },
  {
    name: 'watch',
    description: 'Watch app files and deploy on changes.',
    usage: 'rc-apps watch [--project <path>] --url <server> [auth options]',
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

  const args = argv.slice(1);
  const loadedCommand = await command.load();

  await loadedCommand.run(args, {
    cwd: process.cwd(),
  });
}

main().catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exit(1);
});
