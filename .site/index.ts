import { RocketletClientManager } from 'temporary-rocketlets-server/client/RocketletClientManager';
import { DevCommunicator } from './client/communicator';

export class DevClient {
    private readonly socket: SocketIO.Socket;

    constructor(private readonly server: string, io: any) {
        document.getElementById('hello').style.color = 'blue';
        this.socket = io.connect(server);

        this.socket.on('status', (data) => {
            if (data.loaded) {
                const manager = new RocketletClientManager(new DevCommunicator(this.socket));
                manager.load();
            }
        });
    }

    public getSocket(): SocketIO.Socket {
        return this.socket;
    }
}
