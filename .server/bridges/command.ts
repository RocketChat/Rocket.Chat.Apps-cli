import { IRocketletCommandBridge } from 'temporary-rocketlets-server/server/bridges';
import { ISlashCommand, SlashCommandContext } from 'temporary-rocketlets-ts-definition/slashcommands';

export class ServerCommandBridge implements IRocketletCommandBridge {
    private commands: Map<string, ISlashCommand>;

    constructor() {
        this.commands = new Map<string, ISlashCommand>();
    }

    public getCommands(): Array<string> {
        return Array.from(this.commands.keys());
    }

    public doesCommandExist(command: string, rocketletId: string): boolean {
        console.log('Checking if the command exists:', command);
        return this.commands.has(command);
    }

    public enableCommand(command: string, rocketletId: string): void {
        console.log(`Enabling the command "${command}" per request of the rocketlet: ${rocketletId}`);
    }

    public disableCommand(command: string, rocketletId: string): void {
        console.log(`Disabling the command "${command}" per request of the rocketlet: ${rocketletId}`);
    }

    public modifyCommand(command: ISlashCommand, rocketletId: string): void {
        throw new Error('Not implemented.');
    }

    // tslint:disable-next-line:max-line-length
    public registerCommand(command: ISlashCommand, rocketletId: string): void {
        if (this.commands.has(command.command)) {
            throw new Error(`Command "${command.command}" has already been registered.`);
        }

        this.commands.set(command.command, command);
        console.log(`Registered the command "${command.command}".`);
    }

    public unregisterCommand(command: string, rocketletId: string): void {
        const removed = this.commands.delete(command);

        if (removed) {
            console.log(`Unregistered the command "${command}".`);
        }
    }
}
