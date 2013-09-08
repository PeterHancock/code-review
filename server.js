//> npm install connect
//> node server.js
var connect = require('connect');
connect.createServer(
    connect.static(__dirname + '/public')
).listen(8080);
