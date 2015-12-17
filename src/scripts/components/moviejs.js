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
    var autoload     = validate.isUndefined(options.autoload) ? true : options.autoload;
    var autoplay     = validate.isUndefined(options.autoplay) ? true : options.autoplay;
    var drag         = validate.isUndefined(options.drag) ? true : options.drag;
    var invertFromTo = false;

    var stage, movie, frame, width, height, assetsManifest, loadedImages = [];

    self.initialFrame = validate.isUndefined(options.initialFrame) ? 0 : options.initialFrame;
    self.currentFrame = validate.isUndefined(options.initialFrame) ? 0 : options.initialFrame;
    self.fps          = validate.isUndefined(options.fps) ? 60 : options.fps;
    self.frames       = options.frames || [];
    self.totalFrames  = self.frames.length - 1; // Included 0
    assetsManifest = self.frames;
    self.direction = options.direction || 'forward';
    self.scale     = undefined;
    self.local     = options.local || false;
    self.playing   = false;
    self.hotSpots  = [];

    events.implement(self);

    stage = new createjs.Stage(id);

    movie = new createjs.Container();
    stage.addChild(movie);
    stage.canvas.parentNode.style.display = 'inline-block';

    // grab canvas width and height for later calculations:
    width       = stage.canvas.width;
    height      = stage.canvas.height;
    self.bounds = stage.canvas.getBoundingClientRect();

    createjs.Ticker.framerate = 60;

    // Update the stage
    var _tick = function () {
      self.trigger('update');
      stage.update();
    };
    createjs.Ticker.addEventListener("tick", _tick);

    //Private Methods
    var _preload = function (callback) {
      var queue = new createjs.LoadQueue(self.local); // new createjs.LoadQueue(false) if local
      self.trigger('loading:start', event);
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
        callback(queue);
      });
      queue.loadManifest(assetsManifest);
    };

    var _setupContainer = function (container, options) {
      loop.each(options.attributes, function (value, key) {
        container[key] = value;
      });
      container.origin  = options.attributes || {};
      container.visible = false;
      stage.addChild(container);
    };

    var _addHtml = function (selector, options) {
      if (validate.isObject(selector)) {
        options  = selector;
        selector = undefined;
      }
      var html = validate.isDOMElement(selector) ? selector : (selector ? document.querySelector(selector) : document.createElement('div'));
      if (html) {
        if (options.id) html.id = options.id;
        if (options.className) html.className = options.className;
        if (!validate.isUndefined(options.height)) html.style.height = options.height;
        if (!validate.isUndefined(options.width)) html.style.width = options.width;
        html.style.position = "absolute";
        html.style.top      = 0;
        html.style.left     = 0;

        document.body.appendChild(html);

        var container = new createjs.DOMElement(html);
        _setupContainer(container, options);
        html.style.display = "block";
        return container;
      } else {
        throw 'ERROR: DOM Element not found!';
      }

    };

    var _play = function () {
      if (self.direction === 'forward') self.currentFrame++;
      if (self.direction === 'backward') self.currentFrame--;
      if (self.currentFrame > self.totalFrames) self.currentFrame = 0;
      if (self.currentFrame < 0) self.currentFrame = self.totalFrames;
      self.show(self.currentFrame);
    };

    var _visibility = function (hotSpot) {
      var visible = false;
      if (!validate.isUndefined(hotSpot.frames)) {
        var type = validate.type(hotSpot.frames);
        switch (type) {
          case 'array':
            hotSpot.frames = hotSpot.frames.sort(function (a, b) {
              return a - b;
            });
            if (hotSpot.frames.indexOf(self.currentFrame) > -1) {
              visible = true;
            }
            break;
          case 'object':
            if (hotSpot.frames.range) {
              if (hotSpot.frames.range[0] <= self.currentFrame && hotSpot.frames.range[1] >= self.currentFrame) {
                visible = true;
              }
            }
            break;
          case 'number':
            if (hotSpot.frames === self.currentFrame) {
              visible = true;
            }
            break;
          default:
            visible = false;
        }
      } else {
        visible = true;
      }
      return visible;
    };

    var _updateReg = function (hotSpot, animation) {
      if (!validate.isUndefined(animation.regX)) {
        hotSpot.regX = animation.regX;
      }
      if (!validate.isUndefined(animation.regY)) {
        hotSpot.regY = animation.regY;
      }
    };

    var _processAnimation = function (hotSpot, animation, startFrame) {
      if (animation.attributes || animation.radial) {
        animation.start = parseInt(startFrame);
        if (validate.isUndefined(animation.end)) {
          animation.end = animation.start + animation.duration;
        } else {
          animation.duration = animation.end - animation.start;
        }
        animation.overflow = false;
        var end, start     = animation.start;
        if (animation.end > self.totalFrames) {
          end                = animation.end - self.totalFrames;
          animation.overflow = true;
        } else {
          end = animation.end;
        }
        if ((self.currentFrame >= animation.start && self.currentFrame <= animation.end) ||
          (animation.overflow &&
          ((self.currentFrame >= start && self.currentFrame > end) || (self.currentFrame < start && self.currentFrame <= end)))) {

          var ease     = animation.ease,
              duration = Math.abs(animation.duration);
          var repeats  = (self.currentFrame - start) / duration;

          var update = function (key) {
            var fromKey = key + '-from', toKey = key + '-to', distanceKey = key + '-distance';
            if (self.currentFrame === start) {
              hotSpot[key] = animation[fromKey];
              _updateReg(hotSpot, animation);
            } else {
              if (self.currentFrame === end) {
                hotSpot[key] = animation[toKey];
              } else {
                var step;
                if (animation.overflow && self.currentFrame < start && self.currentFrame <= end) {
                  step = self.currentFrame + (self.totalFrames - start);
                } else {
                  step = self.currentFrame - start;
                }
                if (repeats % duration === 0 && repeats > 1) {
                  step += repeats * duration;
                }
                if (repeats < 1 || (animation.loop && repeats > 1)) {
                  var progress = step / duration, factor, delta;
                  if (validate.isUndefined(hotSpot.origin[key])) hotSpot.origin[key] = hotSpot[key];
                  ease         = ease || createjs.Ease.linear;
                  factor       = ease(progress);
                  delta        = factor * (animation[distanceKey] || animation[toKey]);
                  hotSpot[key] = delta + animation[fromKey];
                }
              }
            }
          };

          var updateRadial = function (key) {
            var fromKey = key + '-from', radial = animation.radial[key];
            if (self.currentFrame === start) {
              _updateReg(hotSpot, animation);
            }
            var step;
            if (repeats % duration === 0 && repeats > 1) {
              step = self.currentFrame - start + repeats * duration;
            } else {
              step = self.currentFrame - start;
            }
            if (repeats < 1 || (animation.loop && repeats > 1)) {
              var progress = step / duration, factor, delta;
              var angle    = progress * 360 + (radial.offset || 0);
              factor       = Math.cos(angle / 180 * Math.PI);
              delta        = factor * radial.radius;
              hotSpot[key] = delta + animation[fromKey];
            }
          };
          var attributes   = animation.attributes ? Object.keys(animation.attributes) : Object.keys(animation.radial);
          if (attributes) {
            loop.iterate(attributes, function (key) {
              if (animation.attributes) {
                update(key);
              } else {
                updateRadial(key);
              }

            });
          }
        }
      } else {
        _updateReg(hotSpot, animation);
      }

    };

    var _processAnimations = function (hotSpot) {
      loop.each(hotSpot.animations, function (animations, startFrame) {
        if (validate.isArray(animations)) {
          loop.iterate(animations, function (animation) {
            _processAnimation(hotSpot, animation, startFrame);
          });
        } else {
          _processAnimation(hotSpot, animations, startFrame);
        }
      });

    };

    var _updateHotSpots = function () {
      loop.iterate(self.hotSpots, function (hotSpot) {
        var visible = _visibility(hotSpot);
        if (visible && hotSpot.animations) {
          _processAnimations(hotSpot);
        }
        hotSpot.visible = visible;
      });

    };

    var _setupDrag = function () {
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
        if (self.currentFrame > self.totalFrames) self.currentFrame = 0;
        if (self.currentFrame < 0) self.currentFrame = self.totalFrames;
        self.show(self.currentFrame);
      });
      movie.on("pressup", function () {
        x0 = undefined;
      });
    };

    var _setScale = function () {
      var image = loadedImages[0];
      if (!self.scale) {
        self.scale = {
          x: width / image.width,
          y: height / image.height
        };
      }
      movie.scaleX = self.scale.x;
      movie.scaleY = self.scale.y;
    };

    var _createFrame = function () {
      frame = new createjs.Bitmap();
      movie.addChild(frame);
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
      frame.image  = loadedImages[index];
      var frameKey = 'frame-' + index;
      self.trigger(frameKey);
      _updateHotSpots();
    };

    self.addHotSpot = function (options) {
      var hotSpot;
      if (validate.isString(options.element) || validate.isDOMElement(options.element)) {
        hotSpot = _addHtml(options.element, {
          className : 'hot-spot',
          attributes: options.attributes
        });
      } else {
        hotSpot = _setupContainer(options.element, options);
      }

      hotSpot.frames     = options.frames;
      hotSpot.animations = options.animations;
      if (hotSpot.animations) {
        var frames = Object.keys(hotSpot.animations);
        frames.sort(function (a, b) {
          return a - b;
        });

        var modifAttr = {};
        loop.iterate(frames, function (frame) {
          var updateAnimations = function (animation) {
            var attributes = animation.attributes ? animation.attributes : animation.radial;
            if (attributes) {
              animation.fromFrame = parseInt(frame);
              animation.toFrame   = animation.fromFrame + animation.duration;
              if (animation.toFrame > self.totalFrames) {
                animation.toFrame  = animation.toFrame - self.totalFrames;
                animation.overflow = true;
              }
              loop.each(attributes, function (value, key) {
                var fromKey        = key + '-from', toKey = key + '-to', distanceKey = key + '-distance';
                animation[fromKey] = validate.isUndefined(modifAttr[key]) ? hotSpot[key] : modifAttr[key];
                if (animation.attributes) {
                  animation[toKey]       = value;
                  animation[distanceKey] = animation[toKey] - animation[fromKey];
                }
                modifAttr[key] = value;
              });
            }
          };

          if (validate.isArray(hotSpot.animations[frame])) {
            loop.iterate(hotSpot.animations[frame], function (animation) {
              updateAnimations(animation);
            });
          } else {
            updateAnimations(hotSpot.animations[frame]);
          }
        });
      }
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

    self.relativeX = function (percentage) {
      return percentage / 100 * self.bounds.width;
    };
    self.relativeY = function (percentage) {
      return percentage / 100 * self.bounds.height;
    };

    self.setAssets = function (assets) {
      assetsManifest = assetsManifest.concat(assets);
    };

    // Preload Frames
    _preload(function (queue) {
      // Start
      loop.iterate(queue.getItems(), function (item) {
        loadedImages.push(item.result);
      });
      _createFrame(queue);
      _setScale();

      if (drag) _setupDrag();
      if (autoload)  self.show(self.initialFrame);
      if (autoplay)  self.play();
    });

  }
  else {
    throw 'ERROR: "options" parameter missing!';
  }
};