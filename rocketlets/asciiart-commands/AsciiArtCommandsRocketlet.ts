import { GimmeCommand } from './commands/GimmeCommand';
import { LennyCommand } from './commands/LennyCommand';
import { ShrugCommand } from './commands/ShrugCommand';
import { TableflipCommand } from './commands/TableflipCommand';
import { UnflipCommand } from './commands/UnflipCommand';

import { IConfigurationExtend } from 'temporary-rocketlets-ts-definition/accessors';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class AsciiArtCommandsRocketlet extends Rocketlet {
    protected extendConfiguration(configuration: IConfigurationExtend): void {
        configuration.slashCommands.provideSlashCommand(new GimmeCommand());
        configuration.slashCommands.provideSlashCommand(new LennyCommand());
        configuration.slashCommands.provideSlashCommand(new ShrugCommand());
        configuration.slashCommands.provideSlashCommand(new TableflipCommand());
        configuration.slashCommands.provideSlashCommand(new UnflipCommand());
    }
}
