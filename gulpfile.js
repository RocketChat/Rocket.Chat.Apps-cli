const fs = require('fs');
const path = require('path');
const async = require('async');
const figures = require('figures');
const del = require('del');
const through = require('through2');
const gulp = require('gulp');
const file = require('gulp-file');
const fontello = require('gulp-fontello');
const download = require('gulp-download');
const merge = require('gulp-merge');
const gutil = require('gulp-util');
const zip = require('gulp-zip');
const jsonSchema = require('gulp-json-schema');
const sourcemaps = require('gulp-sourcemaps');
const tsc = require('gulp-typescript');
const tslint = require('gulp-tslint');
const refresh = require('gulp-refresh');
const spawn = require('child_process').spawn;
const rocketletSchema = require('./rocketlet-schema.json');

function getFolders(dir) {
    return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
}

const rocketletsPath = './rocketlets';
const tsp = tsc.createProject('tsconfig.json');

gulp.task('clean-generated', function _cleanTypescript() {
    return del(['./dist/**', './.server-dist/**']);
});

gulp.task('clean-fontello', function _cleanFontello() {
    return del(['./.site/fontello/**']);
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

gulp.task('compile-server-site-ts', ['clean-generated', 'compile-server-ts'], function _compileServerTypescript() {
    const project = tsc.createProject('.site/tsconfig.json');

    return project.src()
            .pipe(sourcemaps.init())
            .pipe(project())
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('.server-dist/site'));
});

gulp.task('compile-server-site-fontello', ['clean-fontello'], function _fontello() {
    return download('https://raw.githubusercontent.com/RocketChat/Rocket.Chat/develop/packages/rocketchat-theme/client/vendor/fontello/config.json')
            .pipe(fontello({ assetsOnly: false }))
            .pipe(gulp.dest('.site/fontello'));
});

gulp.task('copy-server-site', ['clean-generated', 'compile-server-ts', 'compile-server-site-ts'], function _copyServerSiteContent() {
    const siteSrcs = gulp.src(['.site/**/*.html', '.site/**/*.css', '.site/font/**.*']).pipe(gulp.dest('.server-dist/site'));
    const fontelloSrcs = gulp.src('.site/fontello/**/*').pipe(gulp.dest('.server-dist/site/fontello'));

    return merge(siteSrcs, fontelloSrcs);
});

let server;
gulp.task('run-server', ['lint-no-exit-ts', 'compile-server-ts', 'compile-server-site-ts', 'copy-server-site', 'package-for-develop'], function _runTheServer(cb) {
    if (server) server.kill();

    server = spawn('node', ['.server-dist/server.js']);

    server.stdout.on('data', (msg) => {
        gutil.log(gutil.colors.blue('Server:'), msg.toString().trim());

        if (msg.toString().includes('Completed the loading')) {
            cb();
        }
    });

    server.stderr.on('data', (msg) => {
        gutil.log(gutil.colors.blue('Server:'), msg.toString().trim());
    });

    server.on('close', (code) => {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes....');
        }
    });
});

process.on('exit', () => {
    if (server) server.kill();
});

gulp.task('refresh-lr', ['clean-generated', 'lint-no-exit-ts', 'compile-server-ts', 'compile-server-site-ts', 'copy-server-site', 'package-for-develop', 'run-server'], function _refreshLr() {
    return gulp.src(['.site/**/*.ts', '.site/**/*.html', '.site/**/*.css']).pipe(refresh());
});

gulp.task('default', ['clean-generated', 'lint-no-exit-ts', 'compile-server-ts', 'compile-server-site-ts', 'copy-server-site', 'package-for-develop', 'run-server'], function _watchCodeAndRun() {
    refresh.listen();

    gulp.watch(['rocketlets/**/*', '.server/**/*.ts', '.site/**/*.ts', '.site/**/*.html', '.site/**/*.css'],
        ['clean-generated', 'lint-no-exit-ts', 'compile-server-ts', 'compile-server-site-ts', 'copy-server-site', 'package-for-develop', 'refresh-lr', 'run-server']);
});

//Packaging related items
function _packageTheRocketlets(callback) {
    const folders = getFolders(rocketletsPath)
                        .filter((folder) => fs.existsSync(path.join(rocketletsPath, folder, 'rocketlet.json')) && fs.statSync(path.join(rocketletsPath, folder, 'rocketlet.json')).isFile())
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

            const zippers = validItems.filter((item) => fs.existsSync(path.join(item.dir, item.info.classFile))).map((item) => {
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
