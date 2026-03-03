import { Command } from './types';

export function buildCommandIndex(commands: Command[]): Map<string, Command> {
  const index = new Map<string, Command>();

  for (const command of commands) {
    index.set(command.name, command);

    for (const alias of command.aliases ?? []) {
      index.set(alias, command);
    }
  }

  return index;
}
