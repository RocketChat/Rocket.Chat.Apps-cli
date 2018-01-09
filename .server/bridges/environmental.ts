import { IEnvironmentalVariableBridge } from '@rocket.chat/apps-engine/server/bridges';

export class ServerEnvironmentalVariableBridge implements IEnvironmentalVariableBridge {
    public getValueByName(envVarName: string, appId: string): string {
        throw new Error('Method not implemented.');
    }

    public isReadable(envVarName: string, appId: string): boolean {
        throw new Error('Method not implemented.');
    }

    public isSet(envVarName: string, appId: string): boolean {
        throw new Error('Method not implemented.');
    }
}
