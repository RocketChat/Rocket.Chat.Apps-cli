"use strict";
exports.__esModule = true;
var base_1 = require("temporary-rocketlets-ts-definition/base");
var ts = require("typescript");
var vm = require("vm");
var RocketletCompiler = (function () {
    function RocketletCompiler() {
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
            emitDecoratorMetadata: true
        };
    }
    RocketletCompiler.prototype.linttTs = function (source) {
        throw new Error('Not implemented yet.');
    };
    RocketletCompiler.prototype.toJs = function (source) {
        var result = ts.transpileModule(source, { compilerOptions: this.compilerOptions });
        // TODO: try to determine why I'm not getting any `result.diagnostics`
        return result.outputText;
    };
    RocketletCompiler.prototype.toSandBox = function (js) {
        var script = new vm.Script(js);
        var context = vm.createContext({ require: require, exports: exports });
        var result = script.runInContext(context);
        if (typeof result !== 'function') {
            throw new Error('The provided script is not valid.');
        }
        var rl = new result();
        if (!(rl instanceof base_1.BaseRocketlet)) {
            throw new Error('The script must extend BaseRocketlet.');
        }
        if (typeof rl.getName !== 'function') {
            throw new Error('The Rocketlet doesn\'t have a `getName` function, this is required.');
        }
        if (typeof rl.getVersion !== 'function') {
            throw new Error('The Rocketlet doesn\'t have a `getVersion` function, this is required.');
        }
        if (typeof rl.getID !== 'function') {
            throw new Error('The Rocketlet doesn\'t have a `getID` function, this is required.');
        }
        if (typeof rl.getDescription !== 'function') {
            throw new Error('The Rocketlet doesn\'t have a `getDescription` function, this is required.');
        }
        console.log(rl.getDescription.prototype.constructor);
        console.log(rl.pre_messageSent.prototype.constructor);
        return rl;
    };
    return RocketletCompiler;
}());
exports.RocketletCompiler = RocketletCompiler;
