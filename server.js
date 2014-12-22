// Including libraries
var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    static = require('node-static'); // for serving files

// This will make all the files in the current folder
// accessible from the web
var fileServer = new static.Server('./');

// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
app.listen(process.env.PORT || 8080);

// If the URL of the socket server is opened in a browser
function handler (request, response) {
    request.resume(); // http://stackoverflow.com/questions/19608330/http-localhost8080-is-not-working
    request.addListener('end', function () {
        fileServer.serve(request, response); // this will return the correct file
    });
}

// Delete this row if you want to see debug messages
//io.set('log level', 1);

var w = 750;
var h = 600;
var pixelSize = 5;
global.rows = h / pixelSize;
global.cols = w / pixelSize;
global.canvasData = []; // Internal info storage for canvas pixels
for (var r = 0; r < global.rows; ++r) {
    for (var c = 0; c < global.cols; ++c) {
        global.canvasData[r*global.cols + c] = '#FFFFFF';
    }
}

function updateCanvas (data) {
    var color = data.color;
    for (var i = 0; i < data.points.length; ++i) {
        var point = data.points[i];
        global.canvasData[point.y*global.cols + point.x] = color;
    }
}

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {
    // Start listening for events
    socket.on('drawing', function (data) {
        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
        updateCanvas(data);
        socket.broadcast.emit('drawing', data);
    });

    socket.on('init', function (data) {
        // Send to originating client
        socket.emit('init', global.canvasData);
    });
});

console.log("Server started...");
//console.log(global.canvasData);
