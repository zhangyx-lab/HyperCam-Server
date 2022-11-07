export default class Lockable {
	#lock;
	// Getter of current lock status
	get locked() {
		return this.#lock instanceof Promise
	}
	/**
	 * Queue for next available lock
	 * @returns {Function}
	 */
	async getLock() {
		const lock = this.#lock;
		let resolve;
		const promise = new Promise(res => resolve = res);
		this.#lock = promise;
		await lock;
		return () => {
			resolve();
			if (this.#lock === promise) this.#lock = undefined;
		};
	}
}
