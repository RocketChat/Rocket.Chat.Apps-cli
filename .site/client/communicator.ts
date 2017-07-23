import { RocketletServerCommunicator } from 'temporary-rocketlets-server/client/RocketletServerCommunicator';
import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata/IRocketletInfo';

export class DevCommunicator extends RocketletServerCommunicator {
    constructor(private readonly socket: SocketIO.Socket) {
        super();
    }

    public getEnabledRocketlets(): Promise<Array<IRocketletInfo>> {
        return new Promise((resolve) => {
            this.socket.emit('get/enabled', (enableds) => {
                resolve(enableds);
            });
        });
    }

    public getDisabledRocketlets(): Promise<Array<IRocketletInfo>> {
        return new Promise((resolve) => {
            this.socket.emit('get/disabled', (disableds) => {
                resolve(disableds);
            });
        });
    }

    public getLanguageAdditions(): Promise<Map<string, Map<string, object>>> {
        throw new Error('Method not implemented.');
    }

    public getSlashCommands(): Promise<Map<string, Array<string>>> {
        return new Promise((resolve) => {
            this.socket.emit('get/commands', (commands) => {
                resolve(commands);
            });
        });
    }

    public getContextualBarButtons(): Promise<Map<string, Array<object>>> {
        throw new Error('Method not implemented.');
    }
}
