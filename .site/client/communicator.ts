import { RocketletServerCommunicator } from 'temporary-rocketlets-server/client/RocketletServerCommunicator';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata/IRocketletInfo';

export class DevCommunicator extends RocketletServerCommunicator {
    constructor(private readonly socket: SocketIO.Socket) {
        super();
    }

    public getEnabledRocketlets(): Promise<Array<IRocketletInfo>> {
        return new Promise((resolve) => {
            this.socket.emit('get/enabled', (result) => {
                resolve(result);
            });
        });
    }

    public getDisabledRocketlets(): Promise<Array<IRocketletInfo>> {
        throw new Error('Method not implemented.');
    }

    public getLanguageAdditions(): Promise<Map<string, Map<string, object>>> {
        throw new Error('Method not implemented.');
    }

    public getSlashCommands(): Promise<Map<string, Array<string>>> {
        throw new Error('Method not implemented.');
    }

    public getContextualBarButtons(): Promise<Map<string, Array<object>>> {
        throw new Error('Method not implemented.');
    }
}
