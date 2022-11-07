export default class Streamer {
	// The stream delimiter
	#delimiter;
	// Class constructor
	constructor(delimiter = '\n') {
		this.#delimiter = delimiter;
	}
	// Line buffer
	#buffer = '';
	// Receiver
	receive(buf) {
		const
			str = buf.toString(),
			blocks = str.split(this.#delimiter);
		blocks.forEach((blk, i) => {
			if (i + 1 < blocks.length) {
				// Immediately process this block
				if (i === 0)
					this.#processBlock(this.#buffer + blk);
				else
					this.#processBlock(str);
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
		this.#queue = this.#queue.filter(el => !el(blk));
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