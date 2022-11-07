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
	// Event registerer
	waitFor(cond) {
		if (typeof cond === 'function')
			return new Promise(res => {
				this.#queue.push(blk => {
					const match = cond(blk);
					if (match) res(match);
					return match;
				})
			})
		if (typeof cond === 'string')
			return new Promise(res => {
				this.#queue.push(blk => {
					const match = blk === cond;
					if (match) res(blk);
					return match;
				})
			})
		if (cond instanceof RegExp)
			return new Promise(res => {
				this.#queue.push(blk => {
					cond.lastIndex = 0;
					const match = cond.exec(blk);
					if (match) res(match);
					return match;
				})
			})
	}
}