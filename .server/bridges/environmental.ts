import { IEnvironmentalVariableBridge } from '@rocket.chat/apps-engine/server/bridges';

export class ServerEnvironmentalVariableBridge implements IEnvironmentalVariableBridge {
    public getValueByName(envVarName: string, appId: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    public isReadable(envVarName: string, appId: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    public isSet(envVarName: string, appId: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
