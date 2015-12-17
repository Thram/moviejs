/**
 * Created by thram on 13/12/15.
 */
var validate   = require('./validate');
module.exports = {
  pluck  : function (collection, key) {
    var result = [];
    this.iterate(collection, function (item) {
      result.push(item[key]);
    });
    return result;
  },
  iterate: function (collection, callback) {
    if (validate.isArray(collection) || validate.isNodeList(collection)) {
      for (var i = 0; i < collection.length; i++) {
        if (callback.bind(collection[i])(collection[i], i) === false) {
          break;
        }
      }
    } else {
      throw {
        code   : 'wrong-type-arguments',
        name   : "Wrong type arguments",
        message: "The arguments don't match with any valid combination,  please check the documentation."
      };
    }
  },
  each   : function (collection, callback) {
    if (validate.isObject(collection)) {
      for (var key in collection) {
        if (collection.hasOwnProperty(key)) {
          if (callback.bind(collection[key])(collection[key], key) === false) {
            break;
          }
        }
      }
    } else {
      throw {
        code   : 'wrong-type-arguments',
        name   : "Wrong type arguments",
        message: "The arguments don't match with any valid combination,  please check the documentation."
      };
    }
  }
};