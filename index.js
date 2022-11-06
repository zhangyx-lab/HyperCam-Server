import { SerialPort } from 'serialport';
import { matchDevice } from './device.js';
import { readFileSync } from 'fs';
import { COMBINE, LED, WAIT, RST } from './command.js';
import { resolve } from 'path';
import { ROOT } from './env.js';
console.log(`PID = ${process.pid}`)
const
	led_index = parseInt(process.argv?.[2] ?? 1),
	exposure = parseFloat(process.argv?.[3] ?? 1000.0),
	deviceList = await SerialPort.list(),
	deviceInfo = JSON.parse(
		readFileSync(resolve(ROOT, 'device.json'))
	),
	devicePath = matchDevice(deviceList, deviceInfo),
	device = new SerialPort({
		path: devicePath,
		baudRate: 9600,
		autoOpen: false,
	});
// 
console.log(`Opening device ${devicePath}`);
// Wait until device is open
await new Promise((res, rej) => {
	device.open(err => {
		if (err) rej(err);
		else res();
	});
});

console.log('====== DEVICE ACTIVE ======');
device.on('data', chunk => process.stdout.write(chunk));

/**
 * @param {string} data 
 * @returns 
 */
async function write(data) {
	for (let i = 0; i < data.length; i += 1) {
		await new Promise((res, rej) => {
			device.write(
				data[i],
				'ascii',
				err => {
					if (err) rej(err);
					else res();
				}
			)
		})
	}
	return;
}

try {
	await write(
		COMBINE(
			LED(led_index).ON,
			WAIT(exposure),
			RST()
		)
	)
	await write('$')
	await new Promise(
		res => setTimeout(res, Math.ceil(exposure) + 500)
	);
} catch (e) {
	console.error(e);
} finally {
	device.close(() => process.exit(0));
}
