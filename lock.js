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
	// Get all locks
	static async getLocks(...list) {
		// Check for eligibility
		const typeErrList = list.filter(el => !(el instanceof Lockable));
		if (typeErrList.length)
			throw new Error(`${typeErrList} does not inherit from Lockable`)
		// Gather all unlock functions
		const unlockFnList = await Promise.all(
			list.map(l => l.getLock())
		)
		// Return unlock function for all instances
		return () => {
			unlockFnList.forEach(unlock => unlock());
		}
	}
}
