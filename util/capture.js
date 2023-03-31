// Internal library
import { rename, createReadStream } from 'fs';
import { getUniqueName } from './util.js';
import { resolve } from 'path';

export default function capture(req, res, next) {
	const {
		LED = 1,
		EXP = 100
	} = req.query ?? {}
	console.log('Acquire', { LED, EXP, DELAY, PWM });
	let _unlock;
	Lockable.getLocks(controller, camera).then(async unlock => {
		_unlock = unlock
		// Load command
		await controller
			.WAIT(DELAY)
			.LED(LED).PWM(PWM)
			.WAIT(EXP)
			.RST()
			.commit()
		// Trigger the camera
		await Promise.all([
			controller.exec(),
			camera.trigger()
		]);
		// Rename the file and then release the lock
		const out = getUniqueName(
			uid => resolve(ENV.VAR_DATA, `${uid}.png`)
		);
		await new Promise(
			(res, rej) => rename(
				ENV.TMP_DATA_PATH,
				path,
				err => {
					if (err) rej(err); else res();
				}
			)
		).then(unlock);
		// Send the data
		res.setHeader('content-type', 'image/png');
		res.setHeader('Access-Control-Allow-Origin', '*');
		createReadStream(path).pipe(res);
	}).catch(err => {
		try { _unlock() } catch (e) { }
		next(err);
	});
}