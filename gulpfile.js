(function () {
    'use strict';

    var gulp = require('gulp');
    // var gutil = require('gulp-util');

    var mocha = require('gulp-mocha');

    // var eslint = require('gulp-eslint');
    var jshint = require('gulp-jshint');

    var jsreporter = require('jshint-stylish');

    var unittests = ['./test/unit/*.js'];
    var functests = ['./test/functional/*.js'];
    var scripts = ['*.js', './bin/*', './lib/**/*.js', './test/**/*.js'];

    gulp.task('test:unit', function () {
        return gulp.src(unittests)
            .pipe(mocha({ reporter: 'spec' }));
    });

    gulp.task('test:func', ['test:unit'], function () {
        return gulp.src(functests)
            .pipe(mocha({ reporter: 'spec' }));
    });

    gulp.task('test:catched', function () {
        return gulp.src(unittests)
            .pipe(mocha({ reporter: 'spec' }).on("error", function (/*err*/) {
                this.emit('end');
            })
        );
    });

    // var esconfig = JSON.parse(fs.readFileSync('./.eslintrc'));

    gulp.task('hint', function () {
        return gulp.src(scripts)
            // eslint(esconfig),
            // eslint.formatEach(esreporter),
            .pipe(jshint())
            .pipe(jshint.reporter(jsreporter));
    });

    gulp.task('hackonit', function () {
        gulp.watch(scripts, ['test:catched', 'hint']);
    });

}());
