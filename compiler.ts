import { BaseRocketlet } from 'temporary-rocketlets-ts-definition/base';
import * as ts from 'typescript';
import * as vm from 'vm';

export class RocketletCompiler {
    private readonly compilerOptions: ts.CompilerOptions;

    constructor() {
        this.compilerOptions = {
            lib: ['ES6'],
            target: ts.ScriptTarget.ES2016,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            declaration: false,
            noImplicitAny: false,
            removeComments: true,
            noImplicitReturns: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
        };
    }

    public linttTs(source: string): void {
        throw new Error('Not implemented yet.');
    }

    public toJs(source: string): string {
        const result = ts.transpileModule(source, { compilerOptions: this.compilerOptions });

        // TODO: try to determine why I'm not getting any `result.diagnostics`

        return result.outputText;
    }

    public toSandBox(js: string): BaseRocketlet {
        const script = new vm.Script(js);
        const context = vm.createContext({ require, exports });

        const result = script.runInContext(context);

        if (typeof result !== 'function') {
            throw new Error('The provided script is not valid.');
        }

        const rl = new result();

        if (!(rl instanceof BaseRocketlet)) {
            throw new Error('The script must extend BaseRocketlet.');
        }

        if (typeof rl.getName !== 'function') {
            throw new Error ('The Rocketlet doesn\'t have a `getName` function, this is required.');
        }

        if (typeof rl.getVersion !== 'function') {
            throw new Error ('The Rocketlet doesn\'t have a `getVersion` function, this is required.');
        }

        if (typeof rl.getID !== 'function') {
            throw new Error ('The Rocketlet doesn\'t have a `getID` function, this is required.');
        }

        if (typeof rl.getDescription !== 'function') {
            throw new Error ('The Rocketlet doesn\'t have a `getDescription` function, this is required.');
        }

        console.log(rl.getDescription.prototype.constructor);

        console.log(rl.pre_messageSent.prototype.constructor);

        return rl as BaseRocketlet;
    }
}
