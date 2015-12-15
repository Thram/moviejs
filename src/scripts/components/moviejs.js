/**
 * Created by thram on 11/12/15.
 *
 * Ease Cheatsheet: ["linear", "none", "get", "getPowIn", "getPowOut", "getPowInOut", "quadIn", "quadOut",
 *                  "quadInOut", "cubicIn", "cubicOut", "cubicInOut", "quartIn", "quartOut", "quartInOut",
 *                  "quintIn", "quintOut", "quintInOut", "sineIn", "sineOut", "sineInOut", "getBackIn", "backIn",
 *                  "getBackOut", "backOut", "getBackInOut", "backInOut", "circIn", "circOut", "circInOut", "bounceIn",
 *                  "bounceOut", "bounceInOut", "getElasticIn", "elasticIn", "getElasticOut", "elasticOut", "getElasticInOut",
 *                  "elasticInOut"]
 *
 */
var events     = require('../toolbox/events');
var validate   = require('../toolbox/validate');
var loop       = require('../toolbox/loop');
module.exports = function (id, options) {
  if (options) {
    var self         = this;
    var autoload     = options.autoload || true;
    var autoplay     = options.autoplay || true;
    var drag         = options.drag || false;
    var invertFromTo = false;

    var stage, movie, frame, width, height;

    self.initialFrame = options.initialFrame || 0;
    self.currentFrame = options.initialFrame || 0;
    self.fps          = options.fps || 20;
    self.frames       = options.frames || [];
    self.direction    = options.direction || 'forward';
    self.scale        = undefined;
    self.playing      = false;
    self.hotSpots     = [];

    events.implement(self);

    stage = new createjs.Stage(id);

    movie = new createjs.Container();
    frame = new createjs.Bitmap();
    movie.addChild(frame);
    stage.addChild(movie);
    stage.canvas.parentNode.style.display = 'inline-block';

    // grab canvas width and height for later calculations:
    width  = stage.canvas.width;
    height = stage.canvas.height;

    createjs.Ticker.framerate = 60;

    // Update the stage
    var _tick = function (event) {
      self.trigger('update');
      stage.update();
    };
    createjs.Ticker.addEventListener("tick", _tick);

    //Private Methods
    var _addHtml = function (selector, options) {
      if (validate.isObject(selector)) {
        options  = selector;
        selector = undefined;
      }
      var html = validate.isDOMElement(selector) ? selector : (selector ? document.querySelector(selector) : document.createElement('div'));
      if (html) {
        if (options.id) html.id = options.id;
        if (options.className) html.className = options.className;
        if (options.height) html.style.height = options.height;
        if (options.width) html.style.width = options.width;
        html.style.position = "absolute";
        html.style.top      = 0;
        html.style.left     = 0;

        document.body.appendChild(html);

        var container = new createjs.DOMElement(html);
        loop.each(options.attributes, function (value, key) {
          container[key] = value;
        });
        container.origin = options.attributes || {};
        stage.addChild(container);
        return container;
      } else {
        throw 'ERROR: DOM Element not found!';
      }

    };

    var _play = function () {
      if (self.direction === 'forward') self.currentFrame++;
      if (self.direction === 'backward') self.currentFrame--;
      if (self.currentFrame > (self.frames.length - 1)) self.currentFrame = 0;
      if (self.currentFrame < 0) self.currentFrame = self.frames.length - 1;
      self.show(self.currentFrame);
    };

    var _resetHotSpot = function (hotSpot) {
      var start = self.direction === 'backward' ? hotSpot.lastState : hotSpot.origin;
      loop.each(start, function (value, key) {
        hotSpot[key] = value;
      });
      // Force Reset
      stage.update();
    };

    var _visibility = function (hotSpot) {
      var visible = false;
      if (hotSpot.frames) {
        var type = validate.type(hotSpot.frames);
        switch (type) {
          case 'array':
            hotSpot.frames = hotSpot.frames.sort(function (a, b) {
              return a - b;
            });
            if (hotSpot.frames.indexOf(self.currentFrame) > -1) {
              if (hotSpot.frames[0] === self.currentFrame || hotSpot.frames[hotSpot.frames.length - 1] === self.currentFrame) {
                _resetHotSpot(hotSpot);
              }
              visible = true;
            }
            break;
          case 'object':
            if (hotSpot.frames.range) {
              if (hotSpot.frames.range[0] <= self.currentFrame && hotSpot.frames.range[1] >= self.currentFrame) {
                if (hotSpot.frames.range[0] === self.currentFrame || hotSpot.frames.range[1] === self.currentFrame) {
                  _resetHotSpot(hotSpot);
                }
                visible = true;
              }
            }
            break;
          case 'number':
            if (hotSpot.frames === self.currentFrame) {
              _resetHotSpot(hotSpot);
              visible = true;
            }
            break;
          default:
            visible = false;
        }
      } else {
        if (0 === self.currentFrame || self.frames.length - 1 === self.currentFrame) {
          _resetHotSpot(hotSpot);
        }
        visible = true;
      }
      return visible;
    };

    var _updateHotSpots = function () {
      loop.iterate(self.hotSpots, function (hotSpot) {
        var visible = _visibility(hotSpot);
        if (visible && hotSpot.animations) {
          var frames = Object.keys(hotSpot.animations);
          frames.sort(function (a, b) {
            return self.direction === 'backward' ? b - a : a - b;
          });
          loop.iterate(frames, function (frame, index) {
            frame     = parseInt(frame);
            var fromFrame, toFrame, to;
            fromFrame = frame;
            to        = hotSpot.animations[fromFrame];
            toFrame   = fromFrame + to.duration;
            // Start point
            if (self.currentFrame >= fromFrame && self.currentFrame <= toFrame || (self.currentFrame > toFrame)) {
              var duration = to.duration;
              var ease     = to.ease || createjs.Ease.linear;
              if (self.direction === 'backward') {
                toFrame = frame;
                if (hotSpot.animations[frames[index + 1]]) {
                  to = hotSpot.animations[frames[index + 1]] || {attributes: hotSpot.origin};
                  loop.each(hotSpot.origin, function (value, key) {
                    if (!to.attributes[key])to.attributes[key] = value;
                  });
                } else {
                  to = {attributes: hotSpot.origin};
                }

                fromFrame = frame + duration;
                if (to.reverseEase) {
                  ease = to.reverseEase;
                } else {
                  var replaceEase = function (key, from, to) {
                    var reverseKey = key.replace(from, to);
                    if (createjs.Ease[reverseKey]) {
                      ease = createjs.Ease[reverseKey];
                    }
                  };
                  loop.iterate(Object.keys(createjs.Ease), function (key) {
                    if (ease === createjs.Ease[key]) {
                      if (key.indexOf('InOut') === -1) {
                        if (key.indexOf('In') > -1) {
                          replaceEase(key, 'In', 'Out');
                          return false;
                        }
                        if (key.indexOf('Out') > -1) {
                          replaceEase(key, 'Out', 'In');
                          return false;
                        }
                      }
                    }
                  });
                }
              }
              var update = function (key, value) {
                var fromKey = key + '-from', toKey = key + '-to';
                if (self.currentFrame === fromFrame) {
                  hotSpot[fromKey] = hotSpot[key];
                  hotSpot[toKey]   = value;
                } else {
                  if (self.currentFrame === toFrame) {
                    hotSpot[key] = value;
                    if (!to.loop) {
                      hotSpot[fromKey] = undefined;
                      hotSpot[toKey]   = undefined;
                    }

                  } else {
                    if (invertFromTo) {
                      var aux          = hotSpot[toKey];
                      hotSpot[toKey]   = hotSpot[fromKey];
                      hotSpot[fromKey] = aux;
                    }
                    var distance  = hotSpot[toKey] - hotSpot[fromKey];
                    var frameDiff = (toFrame - fromFrame);
                    var repeats   = (self.currentFrame - fromFrame) / frameDiff;
                    if (repeats % frameDiff === 0 && repeats > 1) {
                      step = self.currentFrame - fromFrame + repeats * frameDiff;
                    } else {
                      step = self.currentFrame - fromFrame;
                    }
                    if (repeats < 1 || (to.loop && repeats > 1)) {
                      var factor = step / frameDiff;
                      console.log(step, factor);
                      if (!hotSpot.origin[key]) hotSpot.origin[key] = hotSpot[key];
                      hotSpot[key] = ease(factor) * distance + hotSpot[fromKey];
                      console.log(hotSpot[key]);
                    }
                  }
                }
              };

              loop.each(to.attributes, function (value, key) {
                update(key, value);
              });

              if (invertFromTo) invertFromTo = false;
            }
          });
        }
        hotSpot.visible = visible;
      });

    };

    //Public API
    self.reset = function () {
      self.currentFrame = self.initialFrame;
      self.show(self.currentFrame);
    };
    self.play  = function () {
      if (!self.playing) {
        self.playing  = true;
        self.interval = setInterval(_play, 1000 / self.fps);
      }
    };
    self.pause = function () {
      if (self.playing) {
        self.playing = false;
        clearInterval(self.interval);
      }
    };
    self.stop  = function () {
      self.pause();
      self.reset();
    };

    self.show = function (index) {
      var image = queue.getResult(self.frames[index].id);
      if (!self.scale) {
        self.scale = {
          x: width / image.width,
          y: height / image.height
        };
      }
      movie.scaleX = self.scale.x;
      movie.scaleY = self.scale.y;

      frame.image  = image;
      var frameKey = 'frame-' + index;
      self.trigger(frameKey);
      _updateHotSpots();
    };

    self.addHotSpot = function (options) {
      var hotSpot        = _addHtml(options.element, {
        className : 'hot-spot',
        attributes: options.attributes
      });
      hotSpot.frames     = options.frames;
      hotSpot.animations = options.animations;
      hotSpot.lastState  = {};
      var frames         = Object.keys(hotSpot.animations);
      frames.sort(function (a, b) {
        return a - b;
      });
      loop.iterate(frames, function (frame) {
        loop.each(hotSpot.animations[frame].attributes, function (value, key) {
          hotSpot.lastState[key] = value;
        });
      });
      self.hotSpots.push(hotSpot);
    };

    self.removeHotSpot = function (options) {
      var remove = function (frame, hotSpot) {
        var key = 'frame-' + frame;
        if (self.hotSpots[key]) {
          if (hotSpot) {
            var i = self.hotSpots[key].indexOf(hotSpot);
            if (i > -1) self.hotSpots[key].splice(i, 1);
          } else {
            delete self.hotSpots[key];
          }
        }
      };
      if (options.frames) {
        switch (type) {
          case 'array':
            loop.iterate(options.frames, function (frame) {
              remove(frame, options.hotSpot);
            });
            break;
          case 'object':
            if (options.frames.range) {
              for (var frame = options.frames.range[0]; frame <= options.frames.range[1]; frame++) {
                remove(frame, options.hotSpot);
              }
            }
            break;
          case 'number':
            if (validate.isArray(options.hotSpot)) {
              loop.iterate(options.hotSpot, function (hotSpot) {
                remove(options.frames, hotSpot);
              });
            } else {
              remove(options.frames);
            }

            break;
        }
      } else {
        if (validate.isArray(options.hotSpot)) {
          loop.iterate(options.hotSpot, function (hotSpot) {
            remove('global', hotSpot);
          });
        } else {
          remove('global');
        }

      }
    };

    self.changeDirection = function (direction) {
      direction = direction || (self.direction === 'backward' ? 'forward' : 'backward');
      if (self.direction != direction) {
        self.direction = direction;
        invertFromTo   = true;
      }
    };

    // Start Movie

    // Preload Frames
    var queue = new createjs.LoadQueue(false); // new createjs.LoadQueue(false) if local
    queue.on("error", function (event) {
      self.trigger('loading:error', event);
    });
    queue.on("fileload", function (event) {
      self.trigger('loading:fileload', event);
    });
    queue.on("fileprogress", function (event) {
      self.trigger('loading:fileprogress', event);
    });
    queue.on("progress", function (event) {
      self.trigger('loading:progress', event);
    });

    queue.on("complete", function (event) {
      self.trigger('loading:complete', event);
      if (drag) {
        var x0;
        movie.on("pressmove", function (evt) {
          if (!x0) {
            x0 = evt.stageX;
            self.pause();
          }
          var x = evt.stageX;
          if (x - x0 > 0) {
            self.changeDirection('forward');
            self.currentFrame++;
          } else {
            self.changeDirection('backward');
            self.currentFrame--;
          }
          x0 = x;
          if (self.currentFrame > (self.frames.length - 1)) self.currentFrame = 0;
          if (self.currentFrame < 0) self.currentFrame = self.frames.length - 1;
          self.show(self.currentFrame);
        });
        movie.on("pressup", function (evt) {
          x0 = undefined;
        });
      }
      if (autoload) {
        self.show(self.initialFrame);
      }
      if (autoplay) {
        self.play();
      }
    });
    queue.loadManifest(self.frames);

  } else {
    throw 'ERROR: "options" parameter missing!';
  }
};
