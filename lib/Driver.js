// Node Native Modules
import { spawn } from 'child_process';
// Project Imports
import Lockable from './Lockable.js';
import CaptureStream from './CaptureStream.js';
import { DRIVER_ARGS } from '../util/env.js';
import logger from '../util/logger.js';
import { toAsync } from '../util/util.js';

const InfoRx = () => /^#\W?/g
let messageBuffer = ""

export function handleDriverMessage(msg) {
	const src = "driver";
	messageBuffer += msg.toString()
	while (true) {
		const index = messageBuffer.indexOf("\n");
		if (index < 0) break;
		const line = messageBuffer.slice(0, index)
		messageBuffer = messageBuffer.slice(index + 1)
		if (InfoRx().test(line))
			logger.info(line.replace(InfoRx(), '').trim(), { src })
		else
			logger.error(line.trim(), { src })
	}
}


export default class Driver extends Lockable {
	#driverPath;
	/**
	 * @type {import('child_process').ChildProcess}
	 */
	#process;
	get process() {
		return this.#process;
	}
	// --------------------------------------------------
	#stream = new CaptureStream;
	#logStream = new CaptureStream;
	// Async function to launch driver
	async #launch() {
		// Parse options
		const
			self = this,
			standbyTimeout = 10_000,
			ready = this.#stream.capture(/^\[STANDBY\]/gi, standbyTimeout),
			args = DRIVER_ARGS ?? [];
		// Create the process
		const proc = spawn(this.#driverPath, args, { stdio: 'pipe' });
		this.#process = proc;
		// Connect pipes
		proc.stdout.pipe(this.#stream);
		proc.stderr.on('data', handleDriverMessage);
		this.#stream.on('data', line => logger.verbose(line, { src: 'driver' }))
		// Wait until driver standby
		try { await ready.promise; } catch (err) {
			if (err instanceof Error) logger.error(err.toString());
			else logger.error(
				`Driver not in standby till timeout (${standbyTimeout}ms)`
			);
			process.exit(1);
		}
		// Handles driver exit
		proc.on('exit', code => {
			logger.info(`Driver process (pid ${proc.pid}) exits with code ${code}`);
			if (self.#process === proc) {
				// Process exited unexpectedly
				logger.error(`Driver unexpectedly exited, restarting...`);
				process.exit(code);
			}
		})
	}
	// --------------------------------------------------
	constructor(driverPath, options = {}) {
		super();
		// Store driver path
		this.#driverPath = driverPath;
		// Launch driver
		this.lockExec(() => this.#launch())
	}
	// Trigger Acquisition
	trigger(config) {
		const done = this.#stream.capture(/^\[(COMPLETE|ABORTED)\]/gi);
		const command = Object
			.entries(config)
			.map(([k, v]) => `${k}=${v}`)
			.join(';')
		logger.info(`command: ${command}`)
		this.#process.stdin.write(command + '\n');
		return done.promise;
	}
	// Restart driver
	async restart() {
		const self = this;
		// Clear all pending captures
		await this.#stream.clear();
		// Lock this driver during restart
		await this.lockExec(async () => {
			// Clear private process record
			const proc = self.#process;
			self.#process = undefined;
			// Wait for termination of existing process
			await toAsync(h => {
				proc.on('exit', () => h());
				proc.kill();
			})
			// Launch new process
		})
	}
}