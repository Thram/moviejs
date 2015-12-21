// Add your code
var movie      = require('./components/moviejs');
var collection = require('./toolbox/collection');
var app        = function () {
  var frames = [];
  for (var i = 1; i <= 14; i++) {
    var slide = ('00' + i).slice(-2);
    var file  = 'assets/images/example/charset_' + slide + '.png';
    frames.push({id: "head-" + i, src: file});
  }
  var pipi    = new movie('pipi', {frames: frames, drag: true});
  var p       = pipi.addHotSpot({
    element   : '#ball',
    attributes: {
      x: 5,
      y: 100
    },
    animations: {
      0: {duration: 10, attributes: {x: 0}, ease: createjs.Ease.bounceInOut}
    }
  });
  var box     = document.querySelector('#ball');
  var current = document.querySelector('#current');
  pipi.on('update', function () {
    current.innerText = 'Frame: ' + pipi.currentFrame;
  });
  box.addEventListener('click', function () {
    alert('Click!');
  });
  var playBtn  = document.querySelector('#play');
  var stopBtn  = document.querySelector('#stop');
  var leftBtn  = document.querySelector('#left');
  var rigthBtn = document.querySelector('#right');
  playBtn.addEventListener('click', pipi.play);
  stopBtn.addEventListener('click', pipi.pause);
  leftBtn.addEventListener('click', function () {
    pipi.changeDirection('backward');
    pipi.play();
  });
  rigthBtn.addEventListener('click', function () {
    pipi.changeDirection('forward');
    pipi.play();
  });
};

window.onload = app;