'use strict';

var util = require('util');
var gulp = require('gulp');
var shell = require('gulp-shell');
var minimist = require('minimist');
var runSequence = require('run-sequence');
var liveServer = require('gulp-live-server');
var TinyShipyardClient = require('tiny-shipyard-client');

var pkg = require('./package.json');

var server;
var args = minimist(process.argv.slice(2), { string: ['tag'] });
var options = {
  serviceName: pkg.name,
  instances: 2,
  registryHost: '46.101.193.82',
  registryPort: '5000',
  shipyardUrl: 'http://46.101.245.190:8080',
  shipyardServiceKey: 'DnqWOkAiUb7YKn6htbJk8RkB8auuJ6fIs1A2',
  versionTag: /^v?\d+\.\d+\.\d+$/.test(args.tag) ? args.tag.replace(/^v/, '') : undefined // do we have a version tag?
}

gulp.task('test', function (done) {
  done(); // Nothing here yet ;-)
});

gulp.task('serve', function (done) {
  server = server || liveServer.new('index.js');
  server.start();
  done();
});

gulp.task('watch', ['serve'], function () {
  gulp.watch(['**/*.js', '!node_modules/**', '!gulpfile.js'], ['test', 'serve']);
});

gulp.task('start-registry-forwarder', function () {
  return gulp.src('', { read: false })
    .pipe(shell('docker run --privileged -d -p 5000:5000 -e REGISTRY_HOST="<%= registryHost %>" -e REGISTRY_PORT="<%= registryPort %>" rsmoorthy/registry-forwarder', { templateData: options }));
});

gulp.task('build-container', function () {
  return gulp.src('', { read: false })
    .pipe(shell('docker build -t <%= serviceName %> .', { templateData: options }));
});

gulp.task('tag-container', function () {
  return gulp.src('', { read: false })
    .pipe(shell('docker tag <%= serviceName %> localhost:5000/<%= serviceName %>:<%= versionTag %>', { templateData: options }));
});

gulp.task('push-container', function () {
  return gulp.src('', { read: false })
    .pipe(shell('docker push localhost:5000/<%= serviceName %>:<%= versionTag %>', { templateData: options }));
});

gulp.task('dockerize', function (done) {
  runSequence('start-registry-forwarder', 'build-container', 'tag-container', 'push-container', done);
});

gulp.task('deploy', function (done) {
  var client = new TinyShipyardClient(options.shipyardUrl, options.shipyardServiceKey);
  var imageName = util.format('%s:%s/%s:%s', options.registryHost, options.registryPort, options.serviceName, options.versionTag);
  var promise = client.createContainer(imageName);
  if (options.instances > 1) {
    promise = promise.then(function (id) {
      return client.scaleContainer(id, options.instances - 1);
    });
  }
  promise.then(function () {
    done();
  }, function (error) {
    done(error);
  });
});

gulp.task('ci-build', function (done) {
  runSequence.apply(null, options.versionTag ? ['test', 'dockerize', 'deploy', done] : ['test', done]);
});

gulp.task('default', ['watch'], function () {});
