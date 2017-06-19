"use strict";
exports.__esModule = true;
var compiler_1 = require("./compiler");
var fs = require("fs");
var path = require("path");
var RocketletManager = (function () {
    function RocketletManager(folder) {
        this.folder = folder;
        this.activeRocketlets = new Map();
        this.inactiveRocketlets = new Map();
        this.compiler = new compiler_1.RocketletCompiler();
        console.log('Constructed the RocketletLoader and the src folder is:', this.folder);
    }
    RocketletManager.prototype.getCompiler = function () {
        return this.compiler;
    };
    RocketletManager.prototype.load = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.folder === '') {
                return reject(new Error('Invalid source folder for loading Rocketlets from.'));
            }
            try {
                fs.readdirSync(_this.folder).forEach(function (file) {
                    var filePath = path.join(_this.folder, file);
                    // Verify it's a typescript file
                    if (!file.endsWith('.ts')) {
                        return;
                    }
                    // Verify it is actually a file
                    var stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        return;
                    }
                    var src = _this.getCompiler().toJs(fs.readFileSync(filePath, 'utf8'));
                    var rocketlet = _this.getCompiler().toSandBox(src);
                    console.log("Successfully loaded " + rocketlet.getName() + "!");
                });
            }
            catch (e) {
                return reject(e);
            }
            // TODO: Combine the two maps values
            return new Array();
        });
    };
    RocketletManager.prototype.get = function (filter) {
        throw new Error('Not implemented yet.');
    };
    RocketletManager.prototype.enable = function (id) {
        throw new Error('Not implemented yet.');
    };
    RocketletManager.prototype.disable = function (id) {
        throw new Error('Not implemented yet.');
    };
    // TODO: Determine what to do with this - add or addRocketlet?
    RocketletManager.prototype.addRocketlet = function (source) {
        throw new Error('Not implemented nor architected.');
    };
    // TODO: Determine what to do with this - add or addRocketlet?
    RocketletManager.prototype.removeRocketlet = function (id) {
        throw new Error('Not implemented nor architected.');
    };
    return RocketletManager;
}());
exports.RocketletManager = RocketletManager;
