/**
 * Created by thram on 10/12/15.
 */
module.exports = function (config) {
  config.set({
    frameworks   : ['browserify', 'jasmine'],
    preprocessors: {
      'src/scripts/tests/**/*.js': ['browserify']
    },
    reporters    : ['spec'],
    browsers     : ['PhantomJS'],
    files        : [
      'src/scripts/tests/**/*.js'
    ],
    browserify   : {
      debug    : true
    }
  });
};