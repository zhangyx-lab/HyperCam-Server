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
	async lock(reason = undefined) {
		const
			self = this,
			lock = this.#lock,
			info = reason && ` for ${reason}` || '';
		let resolve;
		const promise = new Promise(res => resolve = res);
		this.#lock = promise;
		await lock;
		logger.verbose(`locked <${self.constructor.name}>${info}`);
		return function unlock(reason = undefined) {
			resolve();
			logger.verbose(`unlocked <${self.constructor.name}>${info}`);
			if (self.#lock === promise) self.#lock = undefined;
		};
	}
	/**
	 * Protect the callback with lock
	 * @param  {Function} callback
	 * @returns {Promise}
	 */
	lockExec(callback = () => { }, ...args) {
		const
			name = callback?.name ?? 'AnonymousFunction',
			reason = `lockExec(${name})`;
		// Acquire Lock
		return this.lock(reason).then(async unlock => {
			let result = undefined, error = undefined;
			try {
				// Execute callback
				result = await callback(...args);
			} catch (e) {
				logger.info(`Caught error during lockExec: ${e}`);
				error = e ?? new Error('Unknown error');
			} finally {
				// Release Lock
				await unlock(reason);
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
