const Buffer = require('buffer').Buffer;
const i2c = require('i2c-bus');
const config = require('./config');
const { wait } = require('../util');

const mercuryMillimeterCoefficient = 0.00750063755419211;

let i2cAdapter;

let digT = [];
let digP = [];
let digH = [];


async function readData(startAddress, bytesAmount, buffer ) {
	await i2cAdapter.readI2cBlock(config.sensorAddress, startAddress, bytesAmount, buffer);
}

async function writeData(startAddress, bytesAmount, buffer) {
	await i2cAdapter.readI2cBlock(config.sensorAddress, startAddress, bytesAmount, buffer)
}

async function readByte(registerAddress) {
	return await i2cAdapter.readByte(config.sensorAddress, registerAddress);
}

async function writeByte(registerAddress, byte) {
	await i2cAdapter.writeByte(config.sensorAddress, registerAddress, byte);
}

async function init() {
	i2cAdapter = await i2c.openPromisified(config.busNumber);

	await writeByte(config.registers.RESET, config.constants.RESET);

	await wait(config.reloadTimeout);
}

async function writeControlAndConfig() {
	await writeByte(config.registers.CONFIG, config.constants.CONFIG);

	await writeByte(config.registers.CONTROL_HUMIDITY, config.constants.CONTROL_HUMIDITY);
	// ctrl_meas should be written after ctrl_hum in order to activate changes from ctrl_hum
	await writeByte(config.registers.CONTROL_MEASUREMENTS, config.constants.CONTROL_MEASUREMENTS);
}

async function readCalibration() {
	const calibrationBuffer = Buffer.alloc(config.regsSequenceLength.CALIBRATION);
	const calibrationSecondBuffer = Buffer.alloc(config.regsSequenceLength.CALIBRATION_SECOND);

	await readData(
		config.registers.CALIBRATION_START, config.regsSequenceLength.CALIBRATION, calibrationBuffer,
	);

	digT.push(
		calibrationBuffer.readUInt16LE(0),
		calibrationBuffer.readInt16LE(2),
		calibrationBuffer.readInt16LE(4),
	);

	digP.push(
		// P1
		calibrationBuffer.readUInt16LE(6),
		calibrationBuffer.readInt16LE(8),
		calibrationBuffer.readInt16LE(10),
		calibrationBuffer.readInt16LE(12),
		// P5
		calibrationBuffer.readInt16LE(14),
		calibrationBuffer.readInt16LE(16),
		calibrationBuffer.readInt16LE(18),
		calibrationBuffer.readInt16LE(20),
		calibrationBuffer.readInt16LE(22),
	);

	await readData(
		config.registers.CALIBRATION_SECOND_START, config.regsSequenceLength.CALIBRATION_SECOND, calibrationSecondBuffer,
	);

	const h4 = (calibrationSecondBuffer.readUInt8(3) << 4) + (calibrationSecondBuffer.readUInt8(4) & 0xF);
	const h5 = calibrationSecondBuffer.readUInt16LE(4) >> 4;

	digH.push(
		calibrationBuffer.readUInt8(25),
		calibrationSecondBuffer.readInt16LE(0),
		calibrationSecondBuffer.readUInt8(2),
		h4,
		h5,
		calibrationSecondBuffer.readInt8(6),
	)
}

async function waitForData() {
	for(;;) {
		const result = await readByte(config.registers.STATUS);

		if ((result & 0x9) === 0) {
			break;
		}
		await wait(config.readyInterval);
	}
}

function calculateTemperature(adc_T) {
	const var1  = ((adc_T / 16384) - (digT[0] / 1024.0)) * digT[1];
	const var2 = (adc_T /131072) - (digT[0] / 8192);
	const var3 = var2 * var2 * digT[2];

	const tempFine = var1 + var3;
	const temperature = tempFine / 5120;
	return { tempFine, temperature };
}

function calculatePressure(adc_P, tempFine) {
	let var1, var2, pressure;
	var1 = (tempFine / 2) - 64000;
	var2 = var1 * var1 * digP[5] / 32768;
	var2 = var2 + var1 * digP[4] * 2;
	var2 = (var2 / 4) + (digP[3] * 65536);
	var1 = ((digP[2] * var1 * var1 / 524288) + (digP[1] * var1)) / 524288;
	var1 = (1 + (var1 / 32768.0)) * digP[0];
	if (var1 === 0) {
		// avoid exception caused by division by zero
		return 0;
	}

	pressure = 1048576 - adc_P;
	pressure = (pressure - (var2 / 4096)) * 6250 / var1;
	var1 = digP[8] * pressure * pressure / 2147483648;
	var2 = pressure * digP[7] / 32768;
	pressure = pressure + (var1 + var2 + digP[6]) / 16;
	return pressure;
}

function calculateHumidity(adc_H, tempFine) {
	let var_H;
	var_H = tempFine - 76800;
	var_H = (adc_H - ((digH[3] * 64) + (digH[4] / 16384 * var_H)))
		* (
			digH[1] / 65536
			* (1 + (digH[5] / 67108864 * var_H * (1 + (digH[2] / 67108864 * var_H))))
		);
	var_H = var_H * (1 - (digH[0] * var_H / 524288));

	return Math.max(
		0,
		Math.min(100, var_H),
	);
}

async function readAndCalculate() {
	await waitForData();

	const measurementsBuffer = Buffer.alloc(config.regsSequenceLength.MEASUREMENTS)
	await readData(config.registers.MEASUREMENTS_START, config.regsSequenceLength.MEASUREMENTS, measurementsBuffer);

	const adc_P = (measurementsBuffer.readUInt8(0) << 12) + (measurementsBuffer.readUInt16BE(2) >> 4);
	const adc_T = (measurementsBuffer.readUInt8(3) << 12) + (measurementsBuffer.readUInt16BE(4) >> 4);
	const adc_H = measurementsBuffer.readUInt16BE(6);

	const { temperature, tempFine } = calculateTemperature(adc_T);
	const pressure = calculatePressure(adc_P, tempFine);
	const humidity = calculateHumidity(adc_H, tempFine)

	return { temperature, pressure: pressure * mercuryMillimeterCoefficient, humidity };
}

module.exports = {
	init,
	readCalibration,
	writeControlAndConfig,
	readAndCalculate,
};
