(function () {
    'use strict';

    var gulp = require('gulp');
    // var gutil = require('gulp-util');

    var mocha = require('gulp-mocha');

    // var eslint = require('gulp-eslint');
    var jshint = require('gulp-jshint');

    var jsreporter = require('jshint-stylish');
    // var esreporter = require('eslint-stylish');

    var fs = require('fs');

    var tests = ['./test/**/*.js'];
    var scripts = ['*.js', './bin/*', './lib/*.js', './test/*.js'];
    // var scripts = ['./lib/*.js', './test/*.js'];

    gulp.task('mocha', function () {
        return gulp.src(tests)
            .pipe(mocha({reporter: 'nyan'}));
    });

    gulp.task('mocha|catch', function () {
        return gulp.src(tests)
            .pipe(mocha({reporter: 'spec'}).on('error', function (err) {
                console.log(err.toString());
                this.emit('end');
            })
        );
    });

    gulp.task('hint', function () {
        gulp.src(scripts)
            .pipe(jshint())
            .pipe(jshint.reporter(jsreporter));
    });

    gulp.task('hackonit', function () {
        gulp.watch(scripts, ['mocha|catch', 'hint']);
    });

}());
