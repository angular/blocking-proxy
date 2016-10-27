'use strict';

var gulp = require('gulp');
var clangFormat = require('clang-format');
var gulpFormat = require('gulp-clang-format');
var runSequence = require('run-sequence');
var spawn = require('child_process').spawn;

var runSpawn = function(done, task, opt_arg) {
  var child = spawn(task, opt_arg, {stdio: 'inherit'});
  child.on('close', function() {
    done();
  });
};

gulp.task('built:copy', function() {
  return gulp.src(['lib/**/*','!lib/**/*.ts'])
      .pipe(gulp.dest('built/lib/'));
});

gulp.task('webdriver:update', function(done) {
  runSpawn(done, 'webdriver-manager', ['update']);
});

gulp.task('jshint', function(done) {
  runSpawn(done, 'node', ['node_modules/jshint/bin/jshint', 'lib', 'spec', 'scripts',
    '--exclude=lib/selenium-webdriver/**/*.js,spec/dependencyTest/*.js,' +
    'spec/install/**/*.js']);
});

gulp.task('clang-check', function() {
  return gulp.src(['lib/**/*.ts', 'spec/**/*.ts'])
      .pipe(gulpFormat.checkFormat('file', clangFormat))
      .on('warning', function(e) {
    console.log(e);
  });
});

gulp.task('clang', function() {
  return gulp.src(['lib/**/*.ts', 'spec/**/*.ts'])
      .pipe(gulpFormat.format('file', clangFormat))
      .on('warning', function(e) {
    console.log(e);
  });
});

gulp.task('tsc', function(done) {
  runSpawn(done, 'node', ['node_modules/typescript/bin/tsc']);
});

gulp.task('prepublish', function(done) {
  runSequence(['jshint', 'clang'],'tsc', 'built:copy', done);
});

gulp.task('pretest', function(done) {
  runSequence(
    ['webdriver:update', 'jshint', 'clang'], 'tsc', 'built:copy', done);
});

gulp.task('default', ['prepublish']);
gulp.task('build', ['prepublish']);

gulp.task('test:copy', function(done) {
  return gulp.src(['spec/**/*','!spec/**/*.ts'])
      .pipe(gulp.dest('built/spec/'));
});
