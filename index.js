// Internal library
import { rename, createReadStream } from 'fs';
import { resolve } from 'path';
// NPM Package
import express from 'express';
// Project dependencies
import Camera from './camera.js';
import Controller from './controller.js';
import * as ENV from './env.js';
import Lockable from './lock.js';
import { getUniqueName } from './util.js';
const
	controller = new Controller(ENV.CONTROLLER_TARGET),
	camera = new Camera(ENV.DRIVER_PATH, ENV.DRIVER_OPTIONS);
// Wait for device initialization
await Lockable.getLocks(
	controller,
	camera
).then(async unlock => {
	console.log("All devices are ready");
	unlock();
})
// Create server
const server = express()
	// Remove express powered-by header
	.disable('x-powered-by')
	// Dynamic acquire
	.get('/acquire', (req, res, next) => {
		console.log('Acquisition Start');
		Lockable.getLocks(
			controller,
			camera
		).then(async unlock => {
			console.log('Acquisition Start !!!');
			const {
				LED = 1,
				EXP = 80,
				DELAY = 0,
				PWM = 1
			} = req.query ?? {}
			// Start acquire
			await controller
				.WAIT(DELAY)
				.LED(LED).PWM(PWM)
				.WAIT(EXP)
				.RST()
				.commit()
			console.log('====== COMMAND LOADED ======');
			await Promise.all([
				controller.exec(),
				camera.trigger()
			]);
			console.log('====== DONE ======');
			// Rename the file and then release the lock
			const path = getUniqueName(
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
			createReadStream(path).pipe(res);
		}).catch(next);
	})
	.use(express.static(ENV.WEB_STATIC_PATH))
	.use((req, res, next) => {
		res.redirect('/');
	})
	.use((err, req, res, next) => {
		console.error(err);
		try {
			res.sendStatus(500);
		} catch (e) { }
	})
	.listen(ENV.PORT);
