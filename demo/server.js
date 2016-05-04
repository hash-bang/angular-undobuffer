#!/usr/bin/env node
/**
* Extremely simple static website serving script
* This is provided in case you need to deploy a quick demo
*
* Install + run:
*
* 		# from parent directory
*
*		cd demo
*		npm install
*		node server
*
*/


var root = __dirname + '/..';
var express = require('express');
global.app = express();
app.use('/node_modules', express.static(root + '/node_modules'));

app.get('/', function(req, res) {
	res.sendFile('index.html', {root: __dirname});
});

app.get('/angular-undobuffer.js', function(req, res) {
	res.sendFile('angular-undobuffer.js', {root: root});
});

app.get('/undobuffer-worker.js', function(req, res) {
	res.sendFile('undobuffer-worker.js', {root: root});
});

app.use(function(err, req, res, next){
	console.error(err.stack);
	res.send(500, 'Something broke!').end();
});

var port = process.env.PORT || process.env.VMC_APP_PORT || 80;
var server = app.listen(port, function() {
	console.log('Web interface listening on port', port);
});
