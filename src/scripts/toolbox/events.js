/**
 * Created by thram on 11/12/15.
 */
module.exports = {
  implement: function (object) {
    object.events = {};
    object.on     = function (event, callback) {
      object.events[event] = object.events[event] || [];
      object.events[event].push(callback);
    };
    object.off    = function (event, callback) {
      if (callback) {
        for (var i = 0; i < object.events[event].length; i++) {
          if (object.events[event][i] == callback) {
            object.events[event].splice(i, 1);
          }
        }
      } else {
        delete object.events[event];
      }
    };

    function handler(callback, data) {
      setTimeout(function () {
        callback.bind(object)(data);
      });
    }

    object.trigger = function (event, data) {
      if (object.events[event]) {
        for (var i = 0; i < object.events[event].length; i++) {
          handler(object.events[event][i], data);
        }
      }
    };
  }
};