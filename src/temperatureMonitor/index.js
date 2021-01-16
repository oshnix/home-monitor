const { init, readCalibration, writeControlAndConfig, readAndCalculate } = require('./busAdapter');

const moduleName = 'temperature';
const timeout = 10000;

let previousMeasurement;
let intervalDescriptor;
const subscribers = new Set();

function sendMessage(connection, data) {
	connection.send(JSON.stringify({
		moduleName,
		data,
	}));
}

async function prepareModule() {
	await init();
	await readCalibration();
	await writeControlAndConfig();
}

async function getData() {
	previousMeasurement = await readAndCalculate();
}

async function subscribe(connection) {
	if (subscribers.size === 0) {
		await getData();
		intervalDescriptor = setInterval(async () => {
			subscribers.forEach(subscriber => {
				try {
					// TODO use named constant from WS
					if (subscriber.readyState === 1) {
						sendMessage(subscriber, previousMeasurement);
					} else {
						throw new Error('Connection not opened');
					}
				} catch (e) {
					console.info('Error when sending data', e);
					subscribers.delete(subscriber);
				}
			})
		}, timeout);
	}
	sendMessage(connection, previousMeasurement);
	subscribers.add(connection);
}

async function unsubscribe(connection) {
	subscribers.delete(connection);

	if (subscribers.size === 0) {
		clearInterval(intervalDescriptor);
	}
}

module.exports = {
	moduleName,
	prepareModule,
	subscribe,
	unsubscribe,
};
