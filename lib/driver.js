// Node Native Modules
import { spawn } from 'child_process';
// Project Imports
import Lockable from './lock.js';
import Streamer from './streamer.js';
import { DRIVER_ARGS, VAR } from '../util/env.js';
import { delay, getUniqueName } from '../util/util.js';
import { handleMessage } from '../util/logger.js';

export default class Driver extends Lockable {
	/**
	 * @type {import('child_process').ChildProcess}
	 */
	#driver_process;
	get process() {
		return this.#driver_process;
	}
	// --------------------------------------------------
	#streamer = new Streamer;
	// --------------------------------------------------
	constructor(driverPath, options = {}) {
		super();
		// Initialize
		console.log(1)
		this.lockExec(async () => {
			console.log(2)
			// Parse options
			const
				{ display = false } = options,
				ready = this.#streamer.waitFor(/^\[STANDBY\]/gi),
				args = [...DRIVER_ARGS];
			if (display) args.push('-x');
			// Create the process
			const process = spawn(driverPath, args, { stdio: 'pipe' });
			process.stdout.on('data', d => this.#streamer.receive(d));
			process.stderr.on('data', handleMessage);
			console.log(3)
			await ready;
			this.#driver_process = process;
		})
	}
	// Trigger Acquisition
	async trigger(config) {
		const done = this.#streamer.waitFor(/^\[COMPLETE\]/gi);
		const command = Object
			.entries(config)
			.map(([k, v]) => `${k}=${v}`)
			.join(';')
		this.#driver_process.stdin.write(command + '\n');
		return await done;
	}
}