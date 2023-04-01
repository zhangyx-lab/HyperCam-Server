import logger from "../util/logger.js";

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
	async lock() {
		const self = this, lock = this.#lock;
		let resolve;
		const promise = new Promise(res => resolve = res);
		this.#lock = promise;
		await lock;
		logger.verbose(`locked <${self.constructor.name}>`);
		return function unlock() {
			resolve();
			logger.verbose(`unlocked <${self.constructor.name}>`);
			if (self.#lock === promise) self.#lock = undefined;
		};
	}
	/**
	 * Protect the callback with lock
	 * @param  {Function} callback
	 * @returns {Promise}
	 */
	lockExec(callback = () => {}, ...args) {
		// Acquire Lock
		return this.lock().then(async unlock => {
			let result = undefined, error = undefined;
			try {
				// Execute callback
				result = await callback(...args);
			} catch (e) {
				error = e;
			} finally {
				// Release Lock
				await unlock();
				// Throw error if exists
				if (error) throw error;
			}
			// Return callback result
			return result;
		})
	}
	// Get all locks in a given list
	static async locks(...list) {
		// Validate list elements
		for (const el of list) {
			if (!(el instanceof Lockable))
				throw new Error(`${typeErrList} does not inherit from Lockable`)
		}
		// Wait for all locks to be acquired
		const unlockFnList = await Promise.all(
			list.map(l => l.lock())
		)
		// Return unlock function for all instances
		return function unlock() {
			unlockFnList.forEach(unlock => unlock());
		}
	}
}
