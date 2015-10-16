var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var sdk = require('lc-sdk-node.js');

// Define some default values if not set in environment
var PORT = process.env.PORT || 3000;
var SHUTDOWN_TIMEOUT = process.env.SHUTDOWN_TIMEOUT || 10000;
var SERVICE_CHECK_HTTP = process.env.SERVICE_CHECK_HTTP || '/healthcheck';
var client = sdk({ discoveryServers: [
       '46.101.245.190:8500',
       '46.101.132.55:8500',
       '46.101.193.82:8500'
]});


var serviceRoutes = [
	{ 
		"Action": "INDEX",
		"Method": "GET",
		"OrdersCollection": "/orders"
	},
	{ 
		"Action": "CREATE",
		"Method": "POST",
		"OrdersCollection": "/orders"
	},
	{ 
		"Action": "SHOW",
		"Method": "GET",
		"OrdersEntity": "/orders/:id"
	}];

// Create a new express app
var app = express();

app.use(bodyParser.json());

// Add CORS headers
app.use(cors());

// Add health check endpoint
app.get(SERVICE_CHECK_HTTP, function (req, res) {
  res.send({ message: 'OK', routes: serviceRoutes });
});

app.get('/', function (req, res) {
  res.contentType('application/json');
  res.send(JSON.stringify(serviceRoutes));
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

	var handleSuccess = function(result) {
		console.log("SUCCESS!");
	};

	var problem = function(error) {
		console.log("UHOHH");
	};

  client.post('order-notification-service', '/notification/order', order).then(handleSuccess).catch(problem);

  res.status(201).location('/orders/' + (orders.length - 1)).end();
});

// Entity resource 
app.get('/orders/:id', function (req, res) {
  res.contentType('application/json');
  res.send(JSON.stringify(orders[req.params.id]));
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
