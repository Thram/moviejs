/**
 * Created by thram on 13/12/15.
 */
module.exports = {
  type        : (function (global) {
    var toString = Object.prototype.toString;
    var re       = /^.*\s(\w+).*$/;
    return function (obj) {
      if (obj === global) {
        return "global";
      }
      return toString.call(obj).replace(re, '$1').toLowerCase();
    };
  })(this),
  isDOMElement: function (obj) {
    return obj && (!!obj.tagName || this.isType(obj, 'htmldocument') || obj.self === window);
  },
  isType      : function (obj, type) {
    return this.type(obj) === type;
  },
  isUndefined : function (obj) {
    return this.isType(obj, 'undefined');
  },
  isNull      : function (obj) {
    return obj === null;
  },
  isNaN       : function (obj) {
    return isNaN(obj);
  },
  isBoolean   : function (obj) {
    return this.isType(obj, 'boolean');
  },
  isNumber    : function (obj) {
    return this.isType(obj, 'number');
  },
  isString    : function (obj) {
    return this.isType(obj, 'string');
  },
  isObject    : function (obj) {
    return !this.isNull(obj) && this.isType(obj, 'object');
  },
  isFunction  : function (obj) {
    return this.isType(obj, 'function');
  },
  isArray     : function (obj) {
    return this.isType(obj, 'array');
  },
  isNodeList  : function (obj) {
    return this.isType(obj, 'nodelist');
  }
};