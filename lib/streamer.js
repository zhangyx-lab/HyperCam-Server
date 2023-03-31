export default class Streamer {
	// The stream delimiter
	#delimiter;
	#ignore;
	// Class constructor
	constructor(delimiter = /\n/g, ignore = /\r/g) {
		this.#delimiter = delimiter;
		this.#ignore = ignore;
	}
	// Line buffer
	#buffer = '';
	// Receiver
	receive(buf) {
		const
			str = buf.toString().replace(this.#ignore, ''),
			blocks = str.split(this.#delimiter);
		blocks.forEach((blk, i) => {
			if (i + 1 < blocks.length) {
				// Immediately process this block
				if (i === 0)
					this.#processBlock(this.#buffer + blk);
				else
					this.#processBlock(blk);
			} else {
				// Push this block to buffer
				// and wait for next delimiter
				if (i == 0)
					this.#buffer = this.#buffer + blk;
				else
					this.#buffer = blk;
			}
		})
	}
	// Wait queue
	#queue = [];
	// Line Processor
	#processBlock(blk) {
		this.#queue = this.#queue.filter(f => !f(blk));
	}
	// Listener registration
	#waitForCond(cond) {
		return new Promise(res => {
			const stack = [];
			const callback = blk => {
				const match = cond(blk);
				if (match) {
					res(stack);
					return true
				} else {
					stack.push(blk);
					return false
				}
			}
			// Register to queue
			this.#queue.push(callback)
		})
	}
	/**
	 * Event registerer
	 * @param {Function|String|RegExp} cond Condition to wait for
	 * @returns {Promise<[RegExpExecArray, [String]]>}
	 */
	async waitFor(cond) {
		if (typeof cond === 'function')
			return await this.#waitForCond(cond)
		if (typeof cond === 'string')
			return await this.#waitForCond(blk => blk === cond)
		if (cond instanceof RegExp)
			return await this.#waitForCond(blk => {
				cond.lastIndex = 0;
				return cond.exec(blk);
			})
	}
}