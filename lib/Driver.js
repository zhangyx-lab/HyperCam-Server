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
		proc.stdout.on('data', this.#stream.write.bind(this.#stream));
		proc.stderr.on('data', handleDriverMessage);
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
			logger.info(`Driver process (pid ${proc.pid}) exited with code ${code}`);
			if (self.#process === proc) {
				// Process exited unexpectedly
				logger.error(`Driver unexpectedly exited, restarting...`);
				process.exit(code);
			} else {
				logger.verbose('Clearing all pending captures ...');
				self.#stream.clear();
			}
		})
	}
	// --------------------------------------------------
	constructor(driverPath, options = {}) {
		super();
		// Store driver path
		this.#driverPath = driverPath;
		// Launch driver
		this.lockExec(function launchDriver(self) { self.#launch() }, this);
		// Register verbose logger
		this.#stream.on(
			'data',
			line => logger.verbose(line, { src: 'driver' })
		)
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
	restart() {
		const
			self = this,
			proc = this.#process;
		// Clear existing process object
		this.#process = undefined;
		// Listen for termination of existing process
		const terminated = toAsync(h => proc.on('exit', () => h()))
		// Kill the process
		proc.kill();
		// Lock this driver during restart
		return this.lockExec(async function restartDriver() {
			await terminated;
			// Launch new process
			await self.#launch();
		})
	}
}