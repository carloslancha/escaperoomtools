var express = require('express');
var app = express();
var server = require('http').Server(app);

app.use(express.static('dist'));

server.listen(8080, function() {
	console.log("Server running in http://localhost:8080");
});