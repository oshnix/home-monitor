const temperatureModule = require('./temperatureMonitor');

let availableModules = {};
const availableActions = ['subscribe', 'unsubscribe'];

async function initModules() {
	await Promise.all([
		temperatureModule.prepareModule(),
	]);

	availableModules = {
		[temperatureModule.moduleName]: {
			subscribe: temperatureModule.subscribe,
			unsubscribe: temperatureModule.unsubscribe,
		},
	};
}


async function processRequest(data, connection ){
	const { moduleName, action } = data;

	if (
		moduleName
		&& Reflect.has(availableModules, moduleName)
		&& availableActions.includes(action)
	) {
		await availableModules[moduleName][action](connection);
	} else {
		throw new Error('No such module or action');
	}
}


module.exports = {
	initModules,
	processRequest,
}
