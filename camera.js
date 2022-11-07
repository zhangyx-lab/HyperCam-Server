import { spawn } from 'child_process';
import Lockable from './lock.js';
import Streamer from './streamer.js';
import { TMP_DATA_PATH } from './env.js';

export default class Camera extends Lockable {
	/**
	 * @type {import('child_process').ChildProcess}
	 */
	#driver;
	get process() {
		return this.#driver;
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
			ready = this.#streamer.waitFor(/^\[STANDBY\]/gi);
		if (verbose) args.push('-v');
		if (display) args.push('-x');
		// Create the process
		const driver = spawn(
			path,
			args,
			{
				stdio: [null, null, 'pipe']
			}
		);
		driver.stdout.on('data', chunk => {
			this.#streamer.receive(chunk);
			console.log(chunk.toString())
		});
		await ready;
		this.#driver = driver;
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
		this.#driver.stdin.write('\n');
		return await done;
	}
}