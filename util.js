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
	throw new Error('Unable to generate unique file name')
}