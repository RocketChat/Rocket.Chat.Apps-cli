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
const spawn = require('child_process').spawn;
const rocketletSchema = require('./rocketlet-schema.json');

function getFolders(dir) {
    return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
}

const rocketletsPath = './rocketlets';
const tsp = tsc.createProject('tsconfig.json');

gulp.task('clean-generated', function _cleanTypescript() {
    return del(['./dist/**/*', './.server-dist/**/*']);
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

gulp.task('compile-server-ts', ['clean-generated'], function _compileServerTypescript() {
    const project = tsc.createProject('.server/tsconfig.json');

    return project.src()
            .pipe(sourcemaps.init())
            .pipe(project())
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('.server-dist'));
});

let server;
gulp.task('run-server', ['lint-no-exit-ts', 'compile-server-ts', 'package-for-develop'], function _runTheServer() {
    if (server) server.kill();

    server = spawn('node', ['.server-dist/server.js'], { stdio: 'inherit' });
    server.on('close', (code) => {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes....');
        }
    });
});

process.on('exit', () => {
    if (server) server.kill();
});

gulp.task('default', ['clean-generated', 'lint-no-exit-ts', 'compile-server-ts', 'package-for-develop', 'run-server'], function _watchCodeAndRun() {
    gulp.watch(['rocketlets/**/*', '.server/**/*.ts'], ['clean-generated', 'lint-no-exit-ts', 'compile-server-ts', 'package-for-develop', 'run-server']);
});

//Packaging related items
function _packageTheRocketlets(callback) {
    const folders = getFolders(rocketletsPath)
                        .filter((folder) => fs.statSync(path.join(rocketletsPath, folder, 'rocketlet.json')).isFile())
                        .map((folder) => {
                            return {
                                folder,
                                dir: path.join(rocketletsPath, folder),
                                toZip: path.join(rocketletsPath, folder, '**'),
                                infoFile: path.join(rocketletsPath, folder, 'rocketlet.json'),
                                info: require('./' + path.join(rocketletsPath, folder, 'rocketlet.json'))
                            };
                        });

    async.series([
        function _readTheRocketletJsonFiles(next) {
            const promises = folders.map((item) => {
                return new Promise((resolve) => {
                    gulp.src(item.infoFile)
                        .pipe(jsonSchema({ schema: rocketletSchema, emitError: false }))
                        .pipe(through.obj(function transform(file, enc, done) {
                            if (file && !file.isNull() && file.jsonSchemaResult) {
                                item.valid = file.jsonSchemaResult.valid;

                                if (!item.valid) {
                                    gutil.log(gutil.colors.red(figures.cross), gutil.colors.cyan(item.folder + path.sep + 'rocketlet.json'), 'has', gutil.colors.red('failed to validate'));
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
        function _onlyZipGoodRocketlets(next) {
            const validItems = folders.filter((item) => item.valid);

            if (validItems.length === 0) {
                next(new Error('No valid Rocketlets.'));
                return;
            }

            const zippers = validItems.map((item) => {
                return new Promise((resolve) => {
                    gutil.log(gutil.colors.green(figures.tick), gutil.colors.cyan(item.info.name + ' ' + item.info.version));
                    return gulp.src(item.toZip)
                        .pipe(file('.packagedby', fs.readFileSync('package.json')))
                        .pipe(zip(item.info.nameSlug + '_' + item.info.version + '.zip'))
                        .pipe(gulp.dest('dist'))
                        .pipe(through.obj((file, enc, done) => done(null, file), () => resolve()));
                });
            });

            Promise.all(zippers).then(() => next());
        }
    ], callback);
}

gulp.task('package-for-develop', ['clean-generated', 'lint-no-exit-ts'], _packageTheRocketlets);

gulp.task('package', ['clean-generated', 'lint-ts'], _packageTheRocketlets);
