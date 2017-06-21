import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';
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
        const srcFile = ts.createSourceFile('rocketlet.ts', source, ts.ScriptTarget.ES2016);
        // ts.createPro

        const result = ts.transpileModule(source, { compilerOptions: this.compilerOptions });

        // TODO: implement the `ts.createProject` so that we get `result.diagnostics`

        return result.outputText;
    }

    public toSandBox(js: string): Rocketlet {
        const script = new vm.Script(js);
        const context = vm.createContext({ require, exports });

        const result = script.runInContext(context);

        if (typeof result !== 'function') {
            throw new Error('The provided script is not valid.');
        }

        const rl = new result();

        if (!(rl instanceof Rocketlet)) {
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

        if (typeof rl.getRequiredApiVersion !== 'function') {
            throw new Error ('The Rocketlet doesn\'t have a `getRequiredApiVersion` function, this is required.');
        }

        return rl as Rocketlet;
    }
}
