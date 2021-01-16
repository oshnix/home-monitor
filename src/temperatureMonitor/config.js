module.exports = {
	busNumber: 1,
	sensorAddress: 0x76,
	reloadTimeout: 100,
	readyInterval: 10,
	registers: {
		STATUS: 0xF3,
		CONFIG: 0xF5,
		CONTROL_HUMIDITY: 0xF2,
		CONTROL_MEASUREMENTS: 0xF4,
		CALIBRATION_START: 0x88,
		CALIBRATION_SECOND_START: 0xE1,
		MEASUREMENTS_START: 0xF7,
		RESET: 0xE0,
	},
	regsSequenceLength: {
		MEASUREMENTS: 8,
		CALIBRATION: 26,
		CALIBRATION_SECOND: 7,
	},
	constants: {
		// consists of t standby, iir filter, spi3w_enabled
		// t standby to max value of 1000ms - 0b101
		// iir filter to x16 - 0b100
		CONFIG: 0b101_100_0,

		// oversampling x16 - 0b101
		CONTROL_HUMIDITY: 0b101,

		// Contains oversampling of pressure and temperature and operating mode
		// temperature oversampling x16 0b101
		// pressure oversampling x16 0b101
		// normal mode 0b11
		CONTROL_MEASUREMENTS: 0b101_101_11,

		RESET: 0xB6,

		OVERSAMPLING: 0x10,
		SAMPLES: 0x16,
	},
}
