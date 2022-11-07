import { spawn } from 'child_process';
import Lockable from './lock.js';
import Streamer from './streamer.js';
import { TMP_DATA_PATH } from './env.js';
import { Stream } from 'stream';

export default class Camera extends Lockable {
	/**
	 * @type {import('child_process').ChildProcess}
	 */
	#process;
	get process() {
		return this.#process;
	}
	// --------------------------------------------------
	#streamer = new Streamer;
	// --------------------------------------------------
	async launch(path, options) {
		// Get device lock
		const unlock = await this.getLock();
		// Parse options
		const
			{ serial, verbose = false, display = false } = options,
			args = ['-s', serial, '-f', TMP_DATA_PATH],
			ready = this.#streamer.waitFor(/^\[READY\]/gi);
		if (verbose) args.push('-v');
		if (display) args.push('-x');
		// Create the process
		const process = spawn(
			path,
			args,
			[null, this.#streamer, 'pipe']
		);
		await ready;
		this.#process = process;
		return unlock();
	}
	// --------------------------------------------------
	constructor(path, options) {
		super();
		this.launch(path, options);
	}
	// Take photo
	async trigger() {
		const done = this.#streamer.waitFor(/^\[DONE\]/gi);
		this.#process.stdin.write('\n');
		return await done;
	}
}