//> npm install connect
//> node server.js
var connect = require('connect');
connect.createServer(
    connect.static(__dirname + '/index.html')
).listen(8080);
