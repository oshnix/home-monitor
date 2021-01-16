const WS = require('ws');
const config = require('../config.json');
const modules = require('./modules');

(async () => {
	await modules.initModules();

	const server = new WS.Server({ port: config.port });

	server.on('connection', (client) => {
		client.on('message', (payload) => {
			const data = JSON.parse(payload);
			modules.processRequest(data, client);
		});
	})
})();



