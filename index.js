var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var request = require('request');

// Define some default values if not set in environment
var PORT = process.env.PORT || 3000;
var SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 10000;
var SERVICE_CHECK_HTTP = process.env.SERVICE_CHECK_HTTP || '/healthcheck';
var ORDER_NOTIFICATION_SERVICE_URL = process.env.ORDER_NOTIFICATION_SERVICE_URL || 'http://localhost:3000/test/notification/order';

// Create a new express app
var app = express();

app.use(bodyParser.json());

// Add CORS headers
app.use(cors());

// Add health check endpoint
app.get(SERVICE_CHECK_HTTP, function (req, res) {
  res.send({ message: 'OK' });
});

var orders = [];

// Collection resource
app.get('/orders', function (req, res) {
  res.contentType('application/json');
  res.send(JSON.stringify(orders));
});

app.post('/orders', function (req, res) {
	var order = req.body;

  orders.push(order);
  request(
    {
      url: ORDER_NOTIFICATION_SERVICE_URL,
      method: 'POST',
      json: order
  }, function (error, response, body) {
		if (error) {
			console.log('ERROR: Somethin went wrong!');
			console.log(body);
		}
		if (!error && response.statusCode == 200) {
			console.log(body); // Show the HTML for the Google homepage. 
		}
	});
  res.status(201).location('/orders/' + (orders.length - 1)).end();
});

// Entity resource 
app.get('/orders/:id', function (req, res) {
  res.contentType('application/json');
  res.send(JSON.stringify(orders[req.params.id]));
});

app.post('/test/notification/order', function (req, res) {
	console.log('SUCCESS');
  	res.status(201).location('test_succesful').end();
});

// Start the server
var server = app.listen(PORT);

console.log('Service listening on port %s ...', PORT);




////////////// GRACEFUL SHUTDOWN CODE ////

var gracefulShutdown = function () {
  console.log('Received kill signal, shutting down gracefully.');

  // First we try to stop the server smoothly
  server.close(function () {
    console.log('Closed out remaining connections.');
    process.exit();
  });

  // After SHUTDOWN_TIMEOUT we will forcefully kill the process in case it's still running
  setTimeout(function () {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit();
  }, SHUTDOWN_TIMEOUT);
};

// listen for TERM signal .e.g. kill
process.on('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', gracefulShutdown);
