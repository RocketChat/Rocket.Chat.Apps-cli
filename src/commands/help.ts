export interface HelpCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
}

export function renderHelp(commands: HelpCommand[]): string {
  const lines: string[] = [];

  lines.push('Rocket.Chat Apps CLI (v2)');
  lines.push('');
  lines.push('Usage:');
  lines.push('  rc-apps <command> [options]');
  lines.push('');
  lines.push('Commands:');

  const sorted = [...commands].sort((a, b) => a.name.localeCompare(b.name));

  for (const command of sorted) {
    const aliasText = command.aliases && command.aliases.length > 0 ? ` (aliases: ${command.aliases.join(', ')})` : '';
    lines.push(`  ${command.name.padEnd(14)} ${command.description}${aliasText}`);
  }

  lines.push('');
  lines.push('Use "rc-apps help <command>" for detailed usage.');

  return lines.join('\n');
}

export function renderCommandHelp(command: HelpCommand): string {
  return `${command.name}\n\n${command.description}\n\nUsage:\n  ${command.usage}`;
}
