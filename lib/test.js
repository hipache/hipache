require('./memoryMonitor')();

var a = [];
var bomb = function () {
    console.log('MEMORY BOMB!');
    for (var i = 0; i < 50 * (1024 * 1024); ++i) { a.push(i); }
};
setTimeout(bomb, 10 * 1000);
