import { Command, CommandContext } from '../core/types';
import { heading, info } from '../utils/output';

export const envCommand: Command = {
  name: 'env',
  aliases: ['config-env'],
  description: 'Show supported deploy/watch environment variables.',
  usage: 'rc-apps env',
  async run(_argv: string[], _context: CommandContext): Promise<void> {
    heading('Environment Variables');
    info('  RC_APPS_URL          Rocket.Chat base URL (for example: https://chat.example.com)');
    info('  RC_APPS_USERNAME     Login username');
    info('  RC_APPS_PASSWORD     Login password');
    info('  RC_APPS_TOKEN        Personal access token');
    info('  RC_APPS_USER_ID      User ID for personal access token');
    info('  RC_APPS_2FA_CODE     Optional 2FA code for username/password login');
    info('  RC_APPS_ALLOW_HTTP   true/1/yes/on to allow insecure http on non-localhost');
    info('');
    info('Precedence: CLI flags > environment variables > .rcappsconfig');
    info('Tip: run `rc-apps help deploy` for auth and URL examples.');
  },
};
