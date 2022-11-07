import { spawn } from 'child_process';
import Lockable from './lock.js';
import Streamer from './streamer.js';

export default class Camera extends Lockable {
	#process;
	get process() {
		return this.#process;
	}
	// --------------------------------------------------
	#streamer = new Streamer;
	// --------------------------------------------------
	async lanuch(path) {
		const unlock = await this.getLock();
		const process = spawn();
		return unlock();
	}
	// --------------------------------------------------
	constructor(driverPath) {
		super();
		this.lanuch();
	}
}