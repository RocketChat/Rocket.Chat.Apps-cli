import { GimmeComand } from './commands/GimmeCommand';

import { IConfigurationExtend } from 'temporary-rocketlets-ts-definition/accessors';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class AsciiArtCommandsRocketlet extends Rocketlet {
    protected extendConfiguration(configuration: IConfigurationExtend): void {
        configuration.slashCommands.provideSlashCommand(new GimmeComand());
    }
}
