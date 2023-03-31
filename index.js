// Internal library
import { createReadStream, existsSync, unlink } from 'fs';
import { getUniqueName } from './util/util.js';
import { resolve } from 'path';
// NPM Package
import express from 'express';
// Project dependencies
import { PORT, VAR, DRIVER_PATH, WEB_STATIC_PATH } from './util/env.js';
import { logger, WSTransport } from './util/logger.js'
import Driver from './lib/driver.js';
const driver = new Driver(DRIVER_PATH);
// Create server
const server = express()
	// Remove express powered-by header
	.disable('x-powered-by')
	// Dynamic acquire
	.use('/capture', (req, res, next) => {
		// logger.info('Acquire', { LED, EXP, DELAY, PWM });
		driver.lockExec(async () => {
			// Rename the file and then release the lock
			const out = getUniqueName(s => resolve(VAR, `${s}.png`));
			const props = await driver.trigger({ ...req.query, out });
			// Set callback to remove tmp file
			res.on("close", () => {
				try {
					unlink(out)
				} catch (e) {
					logger.error(e.toString())
				}
			})
			// Send the data
			res.setHeader('Access-Control-Allow-Origin', '*');
			console.log(props);// TODO: ENCODE INTO HEADER
			if (existsSync(out)) {
				res.setHeader('content-type', 'image/png');
				createReadStream(out).pipe(res);
			} else {
				res
					.status(404)
					.send("Command executed but no output generated")
					.end()
			}
		}).catch(next)
	})
	.use(express.static(WEB_STATIC_PATH))
	.use((req, res, next) => res.redirect('/'))
	.use((err, req, res, next) => {
		logger.error("server error: " + err.toString());
		try { res.sendStatus(500); } catch (e) { }
	});
//register websocket transport
logger.add(new WSTransport({ wsoptions: { server } }));
// Wait for driver initialization
console.log("waiting for driver")
await driver.lockExec();
//start server
server.listen(PORT)
console.log("listening", PORT)
//random logger for testing
setInterval(function () {
	logger.info("New Random Number is " + parseInt(Math.random() * 1000000));
}, 2000);
