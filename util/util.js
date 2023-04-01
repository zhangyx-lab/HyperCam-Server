import { resolve } from 'path';
import { existsSync } from 'fs';
import { v4 as getUid } from 'uuid';
import { VAR } from './env.js';

export function delay(ms) {
	return new Promise(res => setTimeout(res, ms))
}

export function getUniqueName(
	getPath = uid => resolve(VAR, uid),
	MAX_ATTEMPTS = 1000
) {
	while (MAX_ATTEMPTS-- > 0) {
		const path = getPath(getUid());
		if (!existsSync(path)) return path;
	}
	throw new Error('Unable to generate unique name: max attempts exceeded')
}
/**
 * Wraps functions with callback with Promise
 * @param {(Function<Error>)=>{Promise}} fn 
 * @returns {Promise}
 */
export function toAsync(fn) {
	return new Promise((res, rej) => {
		function handler(err) {
			if (err) rej(err)
			else res()
		}
		fn(handler);
	})
}
/**
 * Checks for real IP of the remote client
 * 
 */
export function realIP(request) {
	return (
		request.headers['x-forwarded-for'] ??
		request.headers['X-Forwarded-For'] ??
		request.headers['x-real-ip'] ??
		request.headers['X-Real-IP'] ??
		request.socket.remoteAddress
	)
}
