import { IAppCommandBridge } from '@rocket.chat/apps-engine/server/bridges';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-ts-definition/slashcommands';

export class ServerCommandBridge implements IAppCommandBridge {
    private commands: Map<string, ISlashCommand>;

    constructor() {
        this.commands = new Map<string, ISlashCommand>();
    }

    public getCommands(): Array<string> {
        return Array.from(this.commands.keys());
    }

    public doesCommandExist(command: string, appId: string): boolean {
        console.log('Checking if the command exists:', command);
        return this.commands.has(command);
    }

    public enableCommand(command: string, appId: string): void {
        console.log(`Enabling the command "${command}" per request of the app: ${appId}`);
    }

    public disableCommand(command: string, appId: string): void {
        console.log(`Disabling the command "${command}" per request of the app: ${appId}`);
    }

    public modifyCommand(command: ISlashCommand, appId: string): void {
        throw new Error('Not implemented.');
    }

    // tslint:disable-next-line:max-line-length
    public registerCommand(command: ISlashCommand, appId: string): void {
        if (this.commands.has(command.command)) {
            throw new Error(`Command "${command.command}" has already been registered.`);
        }

        this.commands.set(command.command, command);
        console.log(`Registered the command "${command.command}".`);
    }

    public unregisterCommand(command: string, appId: string): void {
        const removed = this.commands.delete(command);

        if (removed) {
            console.log(`Unregistered the command "${command}".`);
        }
    }
}
