const { init, readCalibration, writeControlAndConfig, readAndCalculate } = require('./busAdapter');
const { wait } = require('../util');

(async () => {
	try {
		await init();
		await readCalibration();
		await writeControlAndConfig();

		while(true) {
			const { temperature, pressure, humidity, p } = await readAndCalculate();
			console.info(`\nTemperature: ${temperature}`);
			console.info(`Pressure: ${pressure}, ${p}`);
			console.info(`Humidity: ${humidity}`);
			await wait(10000);
		}
	} catch (e) {
		console.error('ERROR', e);
	}
})();