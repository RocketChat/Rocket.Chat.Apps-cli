import { AppClientManager } from '@rocket.chat/apps-engine/client/AppClientManager';
import { DevCommunicator } from './client/communicator';

export class DevClient {
    private readonly socket: SocketIO.Socket;

    constructor(private readonly server: string, io: any) {
        this.socket = io.connect(server);

        this.socket.on('status', (data) => {
            if (data.loaded) {
                const manager = new AppClientManager(new DevCommunicator(this.socket));
                manager.load();
            }
        });
    }

    public getSocket(): SocketIO.Socket {
        return this.socket;
    }
}
