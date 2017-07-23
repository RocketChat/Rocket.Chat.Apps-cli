import { IRocketletCommandBridge } from 'temporary-rocketlets-server/server/bridges';
import { ISlashCommand, ISlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class ServerCommandBridge implements IRocketletCommandBridge {
    private commands: Map<string, (command: string, context: ISlashCommandContext) => {}>;

    constructor() {
        this.commands = new Map<string, (command: string, context: ISlashCommandContext) => {}>();
    }

    public getCommands(): Array<string> {
        return Array.from(this.commands.keys());
    }

    public doesCommandExist(command: string, rocketletId: string): boolean {
        return this.commands.has(command);
    }

    public disableCommand(command: string, rocketletId: string): void {
        console.log(`Disabling the command "${command}" per request of the rocketlet: ${rocketletId}`);
    }

    public modifyCommand(command: ISlashCommand, rocketletId: string): void {
        throw new Error('Not implemented.');
    }

    // tslint:disable-next-line:max-line-length
    public registerCommand(command: string, rocketletId: string, executor: (command: string, context: ISlashCommandContext) => {}): void {
        if (this.commands.has(command)) {
            throw new Error(`Command "${command}" has already been registered.`);
        }

        this.commands.set(command, executor);
        console.log(`Registered the command "${command}".`);
    }

    public unregisterCommand(command: string, rocketletId: string): void {
        const removed = this.commands.delete(command);

        if (removed) {
            console.log(`Unregistered the command "${command}".`);
        }
    }
}
