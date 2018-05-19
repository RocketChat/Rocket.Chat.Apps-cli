const fs = require('fs');
const path = require('path');
const async = require('async');
const figures = require('figures');
const del = require('del');
const through = require('through2');
const gulp = require('gulp');
const file = require('gulp-file');
const gutil = require('gulp-util');
const zip = require('gulp-zip');
const jsonSchema = require('gulp-json-schema');
const sourcemaps = require('gulp-sourcemaps');
const tsc = require('gulp-typescript');
const tslint = require('gulp-tslint');
const refresh = require('gulp-refresh');
const appSchema = require('./app-schema.json');
const argv = require('yargs').argv;
const generateId = require('uuid4');
const pascalCase = require('pascalcase');
const formData = require('form-data');
const tap = require('gulp-tap');

const getFolders = (dir) => fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isDirectory());

const slugify = (text) => text.toString().toLowerCase()
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars
    .replace(/--+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of textte

const appsPath = './apps';
const tsp = tsc.createProject('tsconfig.json');
const devPackageJson = require('./package.json');
const apiVersion = devPackageJson.dependencies['@rocket.chat/apps-ts-definition'].replace('^', '');

gulp.task('clean-generated', function _cleanTypescript() {
    return del(['./dist/**']);
});

gulp.task('create-app', function _createNewApp() {
    if(typeof argv.name != 'string' || argv.name === undefined) {
        gutil.log(gutil.colors.red(figures.cross),  `Please use ${ gutil.colors.cyan('npm run create-app <name>') } to create a new Rocket.Chat App`);
        throw new Error('Incorrect usage of create-app command');
    }
    if(argv.name.match(/[1-9]/) != null) {
        gutil.log(gutil.colors.red(figures.cross),  `App name can't contain numbers`);
        return;
    }
    const slugifiedName = slugify(argv.name);
    if(fs.existsSync(`./apps/${ slugifiedName }`)) {
        gutil.log(gutil.colors.red(figures.cross),  `${ gutil.colors.cyan(argv.name) } already exists in the apps folder`);
        return;
    }

    try {
        fs.mkdirSync(`./apps/${ slugifiedName }`);
    } catch (e) {
        gutil.log(gutil.colors.red(figures.cross),  `Couldn't create a folder for ${ gutil.colors.cyan(argv.name) }`);
        return;
    }
    try {
        fs.writeFileSync(`./apps/${ slugifiedName }/app.json`,
`{
    "id": "${ generateId() }",
    "name": "${ argv.name }",
    "nameSlug": "${ slugifiedName }",
    "version": "0.0.1",
    "requiredApiVersion": "^${ apiVersion }",
    "description": "${ argv.name } Rocket.Chat App",
    "author": {
        "name": "<replace me>",
        "support": "<replace me>"
    },
    "classFile": "index.ts",
    "iconFile": "icon.jpg"
}
`, 'utf8');

      fs.writeFileSync(`./apps/${ slugifiedName }/icon.jpg`, '', 'binary');

      fs.writeFileSync(`./apps/${ slugifiedName }/index.ts`,
`import {
    ILogger,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';

export class ${ pascalCase(argv.name) }App extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }
}
`, 'utf8');

    } catch (e) {
        gutil.log(gutil.colors.red(figures.cross),  `Couldn't create a files for ${ gutil.colors.cyan(argv.name) } app`);
    }
});

gulp.task('lint-ts', function _lintTypescript() {
    return tsp.src().pipe(tslint({ formatter: 'verbose' })).pipe(tslint.report());
});

gulp.task('lint-no-exit-ts', function _lintTypescript() {
    return tsp.src().pipe(tslint({ formatter: 'verbose', emitError: false })).pipe(tslint.report());
});

gulp.task('compile-ts', ['clean-generated', 'lint-ts'], function _compileTypescript() {
    return tsp.src().pipe(sourcemaps.init())
            .pipe(tsp())
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean-generated', 'lint-no-exit-ts','package-for-develop'], function _watchCodeAndRun() {
    refresh.listen();

    gulp.watch(['apps/**/*'],
        ['clean-generated', 'lint-no-exit-ts', 'package-for-develop']);
});

const appsTsCompileOptions = {
    target: 'es5',
    module: 'commonjs',
    moduleResolution: 'node',
    declaration: false,
    noImplicitAny: false,
    removeComments: true,
    strictNullChecks: true,
    noImplicitReturns: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    lib: [ 'es2017' ]
};

//Packaging related items
function _packageTheApps(callback) {
    const folders = getFolders(appsPath)
                    .filter((folder) => fs.existsSync(path.join(appsPath, folder, 'app.json')) && fs.statSync(path.join(appsPath, folder, 'app.json')).isFile())
                    .map((folder) => {
                        return {
                            folder,
                            dir: path.join(appsPath, folder),
                            toZip: path.join(appsPath, folder, '**'),
                            infoFile: path.join(appsPath, folder, 'app.json'),
                            info: require('./' + path.join(appsPath, folder, 'app.json'))
                        };
                    });

    async.series([
        function _testCompileTheTypeScript(next) {
            const promises = folders.map((item) => {
                return new Promise((resolve) => {
                    if (!fs.existsSync('.tmp')) {
                        fs.mkdirSync('./.tmp');
                    }
                    fs.writeFileSync(`.tmp/${ item.info.id }.json`, JSON.stringify({
                        compilerOptions: appsTsCompileOptions,
                        include: [ __dirname + '/' + item.dir ],
                        exclude: ['node_modules', 'bower_components', 'jspm_packages']
                    }), 'utf8');

                    gutil.log(gutil.colors.yellow(figures.ellipsis), gutil.colors.cyan(`Attempting to compile ${item.info.name} v${item.info.version}`));
                    const project = tsc.createProject(`.tmp/${ item.info.id }.json`);

                    project.src().pipe(project().on('error', () => {
                        item.valid = false;
                    })).pipe(through.obj((file, enc, done) => done(null, file), () => {
                        if (typeof item.valid === 'boolean' && !item.valid) {
                            gutil.log(gutil.colors.red(figures.cross), gutil.colors.cyan(`${item.info.name} v${item.info.version}`), 'has', gutil.colors.red('FAILED to compile.'));
                        } else {
                            gutil.log(gutil.colors.green(figures.tick), gutil.colors.cyan(`${item.info.name} v${item.info.version}`), 'has', gutil.colors.green('successfully compiled.'));
                        }

                        resolve();
                    }));
                });
            });

            Promise.all(promises).then(() => next()).catch((e) => {
                console.error(e);
                throw e;
            });
        },
        function _readTheAppJsonFiles(next) {
            const promises = folders.map((item) => {
                if (typeof item.valid === 'boolean' && !item.valid) return Promise.resolve();

                return new Promise((resolve) => {
                    gulp.src(item.infoFile)
                        .pipe(jsonSchema({ schema: appSchema, emitError: false }))
                        .pipe(through.obj(function transform(file, enc, done) {
                            if (file && !file.isNull() && file.jsonSchemaResult) {
                                item.valid = file.jsonSchemaResult.valid;

                                if (!item.valid) {
                                    gutil.log(gutil.colors.red(figures.cross), gutil.colors.cyan(item.folder + path.sep + 'app.json'), 'has', gutil.colors.red('failed to validate'));
                                }
                            }

                            done(null, file);
                        }, function flush() {
                            resolve();
                        }));
                });
            });

            Promise.all(promises).then(() => next());
        },
        function _onlyZipGoodApps(next) {
            const validItems = folders.filter((item) => item.valid);

            if (validItems.length === 0) {
                next(new Error('No valid Apps.'));
                return;
            }

            const amount = Array.from(Array(10), () => figures.line);
            gutil.log(gutil.colors.white(...amount));
            gutil.log(gutil.colors.white(...amount));
            gutil.log(gutil.colors.red('Errors are listed above'));
            gutil.log(gutil.colors.white(...amount));
            gutil.log(gutil.colors.white(...amount));

            const zippers = validItems.filter((item) => fs.existsSync(path.join(item.dir, item.info.classFile))).map((item) => {
                return new Promise((resolve) => {
                    const zipName = item.info.nameSlug + '_' + item.info.version + '.zip';
                    return gulp.src(item.toZip)
                        .pipe(file('.packagedby', fs.readFileSync('package.json')))
                        .pipe(zip(zipName))
                        .pipe(gulp.dest('dist'))
                        .pipe(through.obj((file, enc, done) => done(null, file), () => {
                            gutil.log(gutil.colors.green(figures.tick),
                                gutil.colors.cyan(item.info.name + ' v' + item.info.version),
                                gutil.colors.blue('has been packaged at:'),
                                gutil.colors.black('dist/' + zipName));
                            resolve();
                        }));
                });
            });

            Promise.all(zippers).then(() => next());
        }
    ], callback);
}

gulp.task('package-for-develop', ['clean-generated', 'lint-no-exit-ts'], _packageTheApps);

gulp.task('package', ['clean-generated', 'lint-ts'], _packageTheApps);

gulp.task('deploy', [], function() {
  let source;
  if(typeof argv.filename != 'string' || argv.filename === undefined) {
    console.log('Deploying all apps');
    source = gulp.src('./dist/*.zip');
  } else if(fs.existsSync(`./dist/${ argv.filename }`)) {
    source = gulp.src(`./dist/${argv.filename}`);
  }
  if (!source) throw Error("Package for deployment was not found.");

  source.pipe(tap((item) => {
        // console.log(fs.readFileSync(`${item.path}`));
        const data = new formData();
        data.append('app', fs.createReadStream(item.path));
        data.submit({
            host: 'localhost',
            port: '3000',
            path: '/api/apps',
            headers: {}
        }, (err) => {
          if(err) throw err;
          console.log('deployed', item.path);
        });

      })
    );
});
