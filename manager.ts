import { RocketletCompiler } from './compiler';
import { IGetRocketletsFilter } from './interfaces/IGetRocketletsFilter';

import * as fs from 'fs';
import * as path from 'path';
import { BaseRocketlet } from 'temporary-rocketlets-ts-definition/base';
import * as ts from 'typescript';
import * as vm from 'vm';

export class RocketletManager {
    private readonly activeRocketlets: Map<number, BaseRocketlet>;
    private readonly inactiveRocketlets: Map<number, BaseRocketlet>;
    private readonly compiler: RocketletCompiler;

    constructor(public folder: string) {
        this.activeRocketlets = new Map<number, BaseRocketlet>();
        this.inactiveRocketlets = new Map<number, BaseRocketlet>();
        this.compiler = new RocketletCompiler();
        console.log('Constructed the RocketletLoader and the src folder is:', this.folder);
    }

    public getCompiler(): RocketletCompiler {
        return this.compiler;
    }

    public load(): Promise<Array<BaseRocketlet>> {
        return new Promise((resolve, reject) => {
            if (this.folder === '') {
                return reject(new Error('Invalid source folder for loading Rocketlets from.'));
            }

            try {
                fs.readdirSync(this.folder).forEach((file) => {
                    const filePath = path.join(this.folder, file);
                    // Verify it's a typescript file
                    if (!file.endsWith('.ts')) {
                        return;
                    }

                    // Verify it is actually a file
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        return;
                    }

                    const src = this.getCompiler().toJs(fs.readFileSync(filePath, 'utf8'));
                    const rocketlet = this.getCompiler().toSandBox(src);

                    console.log(`Successfully loaded ${rocketlet.getName()}!`);
                });
            } catch (e) {
                return reject(e);
            }

            // TODO: Combine the two maps values
            return new Array<BaseRocketlet>();
        });
    }

    public get(filter: IGetRocketletsFilter): Array<BaseRocketlet> {
        throw new Error('Not implemented yet.');
    }

    public enable(id: number): boolean {
        throw new Error('Not implemented yet.');
    }

    public disable(id: number): boolean {
        throw new Error('Not implemented yet.');
    }

    // TODO: Determine what to do with this - add or addRocketlet?
    public addRocketlet(source: string): BaseRocketlet {
        throw new Error('Not implemented nor architected.');
    }

    // TODO: Determine what to do with this - add or addRocketlet?
    public removeRocketlet(id: number): BaseRocketlet {
        throw new Error('Not implemented nor architected.');
    }
}
