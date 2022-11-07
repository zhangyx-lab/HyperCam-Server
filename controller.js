import { SerialPort } from 'serialport';
import Lockable from './lock.js';
import Streamer from './streamer.js';
import { delay } from './util.js';
// Utility functions
async function getDevicePath(target) {
	while (true) {
		for (const device of await SerialPort.list()) {
			// Only check device if has string property 'path'
			if (typeof device?.path !== 'string') continue;
			// Check if device matches target
			let flag = true;
			for (const key in target) {
				if (target[key] !== device?.[key]) {
					flag = false;
					break;
				}
			}
			if (flag) return device.path;
		}
		await delay(1000);
	}
}
// The Controller Device
export default class Controller extends Lockable {
	#device;
	get device() { return this.#device }
	// ----------------------------------------
	#cmd = []
	// ----------------------------------------
	constructor(target) {
		super();
		this.#init(target);
	}
	// ----------------------------------------
	async #init(target) {
		// Clear previously created device instance
		this.#device = undefined;
		// Lock the device before initialization
		const unlock = await this.getLock();
		// Wait until device is online
		const devicePath = await getDevicePath(target);
		// Create device instance
		const device = new SerialPort({
			path: devicePath,
			baudRate: 9600,
			autoOpen: false,
		});
		// Initialize device
		while (
			await new Promise(res => {
				device.open(err => {
					if (err) {
						console.error(err);
						res(false);
					} else res(true);
				})
			}) === false
		);
		// Register Device Data Handler
		device.on('data', chunk => {
			this.#streamer.receive(chunk);
			process.stdout.write(chunk);
		});
		// Register Device Error Handler
		device.on('error', err => {
			console.error(err);
			device.close(err => {
				if (err) console.error(err);
				this.#init(target);
			})
		})
		// Assign new device to controller
		this.#device = device;
		// Unlock this controller
		return unlock();
	}
	// ----------------------------------------
	#streamer = new Streamer('\n');
	// Send to device (byte by byte)
	async #send(str) {
		for (const char of str) {
			await new Promise((res, rej) => {
				this.#device.write(
					char,
					'ascii',
					err => {
						if (err) rej(err);
						else res();
					}
				)
			})
		}
	}
	// Execute committed commands
	exec() {
		return Promise.all([
			this.#send('$'),
			this.#streamer.waitFor(
				/^\>\>\s*Execution FINISHED/gi
			)
		])
	}
	// Commit commands to the controller
	async commit() {
		await this.#send(
			this.#cmd
				.map(el => el.replace(/[\n;]{2,}/gi, ';'))
				.join(';')
			+ ';'
		)
		this.#cmd = [];
	}
	// LED Command Parser
	LED(index) {
		const self = this;
		if (index < 1 || index > 8)
			throw new Error(`[LED] Index ${index} out of range`);
		return {
			get ON() {
				this.#cmd.push(`LED ${index} 128`)
				return self
			},
			get OFF() {
				this.#cmd.push(`LED ${index} 0`)
				return self
			},
			PWM(val) {
				if (val < 0 || val > 128)
					throw new Error(`[LED] PWM ${val} out of range (0 - 128)`)
				this.#cmd.push(`LED ${index} ${Math.round(val)}`)
				return self
			}
		};
	}
	// WAIT Command Parser
	WAIT(time) {
		if (time < 0)
			throw new Error(`[WAIT] Time period has to be positive`);
		let time_ns = Math.round(time * 1000);
		this.#cmd.push(`WAIT ${time_ns}`);
		return this;
	}
	// RST Command Parser
	RST() {
		this.#cmd.push(`RST`);
		return this;
	}
}