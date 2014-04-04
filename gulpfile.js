(function () {
    'use strict';

    var gulp = require('gulp');
    // var gutil = require('gulp-util');

    var mocha = require('gulp-mocha');

    // var eslint = require('gulp-eslint');
    var jshint = require('gulp-jshint');

    var jsreporter = require('jshint-stylish');

    var driverstests = ['./test/unit/driver-*'];
    var unittests = ['./test/unit/*.js', '!./test/unit/driver-*'];
    var functests = ['./test/functional/*.js'];
    var alltests = ['./test/**/*.js'];
    var scripts = ['*.js', './bin/*', './lib/**/*.js', './test/**/*.js'];

    gulp.task('hint', function () {
        return gulp.src(scripts)
            // eslint(esconfig),
            // eslint.formatEach(esreporter),
            .pipe(jshint())
            .pipe(jshint.reporter(jsreporter))
            .pipe(jshint.reporter('fail'));
    });

    gulp.task('test:unit', function () {
        return gulp.src(unittests)
            .pipe(mocha({ reporter: 'spec' }));
    });

    // These also tests expiring / timeouts, hence are long - to be run manually only
    gulp.task('test:drivers', function () {
        return gulp.src(driverstests)
            .pipe(mocha({ reporter: 'spec' }));
    });


    gulp.task('hint-catched', function () {
        return gulp.src(scripts)
            // eslint(esconfig),
            // eslint.formatEach(esreporter),
            .pipe(jshint())
            .pipe(jshint.reporter(jsreporter));
    });

    gulp.task('test:unit-catched', ['hint-catched'], function () {
        return gulp.src(unittests)
            .pipe(mocha({ reporter: 'spec' }).on("error", function (/*err*/) {
                this.emit('end');
            })
        );
    });

    gulp.task('test:drivers-catched', ['test:unit-catched'], function () {
        return gulp.src(driverstests)
            .pipe(mocha({ reporter: 'spec' }).on("error", function (/*err*/) {
                this.emit('end');
            })
        );
    });

    gulp.task('test:func', function () {
        return gulp.src(functests)
            .pipe(mocha({ reporter: 'spec' }));
    });

    gulp.task('test:all', function () {
        return gulp.src(alltests)
            .pipe(mocha({ reporter: 'spec' }));
    });

    // var esconfig = JSON.parse(fs.readFileSync('./.eslintrc'));

    gulp.task('hack:hipache', function () {
        gulp.watch(scripts, ['test:unit-catched']);
    });

    gulp.task('hack:drivers', function () {
        gulp.watch(scripts, ['test:drivers-catched']);
    });

}());
