import { Writable } from 'stream';
import logger from '../util/logger.js'


class EndlessWritable extends Writable {
	// Do nothing upon destroy
	_destroy() {
		const instance = `EndlessWritable<${this.name ?? this.constructor.name}>`
		logger.verbose(`${instance} ignoring pipe close signal`);
	}
}


class Capture extends Writable {
	#resolve;
	#reject;
	#promise = new Promise((resolve, reject) => {
		this.#resolve = resolve;
		this.#reject = reject;
	});
	/**
	 * @returns {Promise<{match: Boolean|RegExpExecArray, stack: String[]}>}
	 */
	get promise() { return this.#promise; }
	// Capture stack
	#stack = [];
	get stack() { return this.stack; }
	// Matching condition
	#condition;
	// Timeout number
	#timeout = undefined;
	// close handler
	#closed = false;
	get closed() { return this.#closed }
	#close() {
		if (this.#closed) return false;
		else {
			this.#closed = true;
			// Log this event
			logger.verbose(`Closing ${this.name}`);
			// Clear timeout for GC
			clearTimeout(this.#timeout);
			// Emit close event
			this.emit("close");
			// Close operation succeeded
			return true;
		}
	}
	/**
	 * Registers condition to be captured
	 * @param {Function} cond Condition to be matched
	 * @param {Number|undefined} timeout Timeout in ms
	 * @returns {Promise<String[]>} Lines that 
	 */
	constructor(condition, timeout) {
		super();
		this.name = (typeof condition === 'function')
			? `Function<$(condition.name)>`
			: condition.toString();
		// Assign condition
		if (typeof condition === 'function')
			this.#condition = condition;
		else if (typeof cond === 'string')
			this.#condition = blk => blk === condition;
		else if (condition instanceof RegExp)
			this.#condition = blk => {
				condition.lastIndex = 0;
				return condition.exec(blk);
			};
		// Check for timeout
		const self = this;
		if (timeout !== undefined)
			this.#timeout = setTimeout(() => {
				logger.warn("Aborting due to timeout");
				self.abort();
			}, timeout);
	}
	// Abort
	abort() {
		if (this.#close())
			logger.warn(`Closing ${this.name} multiple times`);
		// Log this event
		logger.warn(`Aborting ${this.name}`);
		// Reject the promise with captured stack
		this.#reject();
		return true;
	}
	// Writeable implementation
	_write(str, encoding, callback) {
		if (this.closed)
			throw new Error(`Writing closed stream ${this.name}`);
		// Match str against own condition
		const match = this.#condition(str);
		if (match) {
			this.#close();
			this.#resolve({ stack: this.#stack, match });
		} else {
			this.#stack.push(str);
		}
		callback();
	}
	_destroy() { }
}


export default class CaptureStream extends EndlessWritable {
	constructor(delimiter = /\n/g, transformer = s => s.toString()) {
		super();
		this.#delimiter = delimiter;
		this.#transformer = transformer;
		this.on('data', d => this.#queue.forEach(c => c.write(d)))
	}
	// Abort all pending captures
	clear() {
		return Promise.all(
			this.#queue.map(
				async capture => capture.abort()
			)
		)
	}
	/**
	 * @type {Capture[]} List of pending captures
	 */
	#queue = [];
	/**
	 * Event registerer
	 * @param {Function|String|RegExp} cond Condition to wait for
	 * @param {Number|undefined} timeout Timeout in ms.
	 * If defined, the promise will be rejected upon timeout.
	 * The rejected promise will return all messages captured before timeout.
	 * @returns {Capture}
	 */
	capture(cond, timeout = undefined) {
		const
			self = this,
			capture = new Capture(cond, timeout);
		this.#queue.push(capture);
		return capture.on('close', () => {
			self.#queue = self.#queue.filter(e => e !== capture);
		});
	}
	// Receiver
	_write(buf, encoding, callback) {
		const [block, ...blocks] = this.#transform(buf);
		// Immediately append first block to buffer
		this.#buffer += block;
		// Only flushes if more than one delimiter was received
		for (const block of blocks) this.#flush(block);
		// Callback
		callback();
	}
	// The stream delimiter
	#delimiter;
	/**
	 * @type {(Buffer)=>String}
	 */
	#transformer;
	/**
	 * Perform a transformation on received buffer
	 * @param {Buffer} buf 
	 * @returns {String[]} Formatted segmentation(s)
	 */
	#transform(buf) {
		return this.#transformer(buf).split(this.#delimiter);
	}
	// Line buffer
	#buffer = "";
	// Dispatches current buffer and replaces it with new buffer
	#flush(buffer = "") {
		this.emit('data', this.#buffer);
		this.#buffer = buffer;
	}
}