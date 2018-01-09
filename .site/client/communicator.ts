import { AppServerCommunicator } from '@rocket.chat/apps-engine/client/AppServerCommunicator';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata/IAppInfo';

export class DevCommunicator extends AppServerCommunicator {
    constructor(private readonly socket: SocketIO.Socket) {
        super();
    }

    public getEnabledApps(): Promise<Array<IAppInfo>> {
        return new Promise((resolve) => {
            this.socket.emit('get/enabled', (enableds) => {
                resolve(enableds);
            });
        });
    }

    public getDisabledApps(): Promise<Array<IAppInfo>> {
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
