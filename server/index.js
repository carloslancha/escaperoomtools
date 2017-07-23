const express = require('express');
const path = require('path');
const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var CONFIG = require('./config.js');

var CounterCollection = require("./CounterCollection.js");

let counterCollection = new CounterCollection();

function massageCounterData(counter) {
	return {
		countdown: counter.countdown,
		endTime: counter.endTime,
		id: counter.id,
		initialTime: counter.initialTime,
		time: counter.time
	};
}

function massageCounters(counters) {
	let massagedCounters = [];

	counters.forEach((counter) => {
		massagedCounters.push(massageCounterData(counter));
	});

	return massagedCounters;
}

// SOCKET CONNECTION
io.on('connection', function(socket) {
	// SOCKET EVENTS

	// COUNTERS EVENTS
	socket.on('createCounter', (config) => {
		let counter = counterCollection.add(config);

		counter.on('timeUpdated', (time) => {
			io.sockets.emit('countersChanged', {
				counters: massageCounters(counterCollection.getAll())
			});
		});

		counter.on('timeEnded', () => {
			if (counter.destroyOnEnd) {
				counterCollection.remove(counter);

				let lastCounter = counterCollection.getLast();

				if (lastCounter) {
					lastCounter.start();
				}

				io.sockets.emit('countersChanged', {
					counters: massageCounters(counterCollection.getAll())
				});
			}
		});

		io.sockets.emit('countersChanged', {
			counters: massageCounters(counterCollection.getAll())
		});
	});

	socket.on('getCounters', () => {
		io.sockets.emit('countersChanged', {
			counters: massageCounters(counterCollection.getAll())
		});
	});

	socket.on('startCounter', () => {
		let lastCounter = counterCollection.getLast();

		if (!lastCounter) {
			io.sockets.emit('counterError', {
				error: 'No counters found'
			});
			return false;
		}

		counterCollection.stopAll();

		lastCounter.start();

		io.sockets.emit('countersChanged', {
			counters: massageCounters(counterCollection.getAll())
		});
	});

	socket.on('stopCounter', () => {
		let lastCounter = counterCollection.getLast();

		lastCounter.stop();

		io.sockets.emit('countersChanged', {
			counters: massageCounters(counterCollection.getAll())
		});
	});

	socket.on('resetCounter', () => {
		counterCollection.removeAll();

		io.sockets.emit('countersChanged', {
			counters: massageCounters(counterCollection.getAll())
		});
	});
});

// Serve static assets
app.use(express.static(path.resolve(__dirname, '..', 'build')));

// Always return the main index.html, so react-router render the route in the client
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});

server.listen(CONFIG.PORT, () => {
  console.log(`App listening on port ${CONFIG.PORT}!`);
});

