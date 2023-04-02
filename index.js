// Internal library
import { createReadStream, existsSync, unlink } from 'fs';
import { getUniqueName, toAsync, realIP } from './util/util.js';
import { resolve } from 'path';
// NPM Package
import express from 'express';
// Project dependencies
import { PORT, TMP, DRIVER_PATH, WEB_STATIC_PATH } from './util/env.js';
import logger from './util/logger.js'
import Driver from './lib/Driver.js';
// Log current PID
logger.info(`Server started as PID<${process.pid}>`);
// Initialize driver
const driver = new Driver(DRIVER_PATH);
// Create server
const server = express()
	// Remove express powered-by header
	.disable('x-powered-by')
	.use((req, res, next) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		logger.verbose(req.url);
		next();
	})
	// Remote restart
	.use('/restart-driver', (req, res, next) => {
		logger.warn(`Driver restart demanded by ${realIP(req)}`);
		driver
			.restart()
			.then(() => res.status(200).send('success'))
			.catch(next);
	})
	// Remote restart
	.use('/restart-server', (req, res, next) => {
		logger.warn(`Server Restart demanded by ${realIP(req)}`);
		res.status(200).send('success');
		process.exit(0);
	})
	// Dynamic acquire
	.use('/capture', (req, res, next) => {
		// Lock the driver for capturing
		driver.lockExec(async function Capture() {
			// Rename the file and then release the lock
			const
				out = getUniqueName(s => resolve(TMP, `${s}.png`)),
				props = await driver.trigger({ ...req.query, out });
			// Send the data
			for (const prop of props.stack) {
				const [key, ...val] = prop.split("=")
				if (!val || !val.length) {
					logger.warn(`Unable to process property string ${prop}`);
					continue;
				} else {
					res.setHeader(`cap-prop-${key.trim()}`, val.join('=').trim());
				}
			}
			if (existsSync(out)) {
				res.setHeader('Content-Type', 'image/png');
				try {
					logger.verbose(`Sending ${out}`);
					await toAsync(h => createReadStream(out)
						.pipe(res)
						.on("finish", h)
					);
				} catch (e) {
					logger.error(e.toString());
				} finally {
					logger.verbose(`Unlinking ${out}`);
					await toAsync(h => unlink(out, h));
				}
			} else {
				logger.warn(`Capture request executed but no output produced (expected at ${out})`);
				res
					.setHeader('Content-Type', 'text/plain')
					.status(404)
					.send("Command executed but no output generated")
			}
		}).catch(next)
	})
	.use(express.static(WEB_STATIC_PATH))
	.use((req, res, next) => res.redirect('/'))
	.use((err, req, res, next) => {
		logger.error(err.toString());
		if (err?.stack) logger.info(err.stack.toString());
		try {
			res
				.setHeader('Content-Type', 'text/plain')
				.status(500)
				.send(err.toString());
		} catch (e) {
			logger.verbose(`Error terminating response during error handling: ${e}`);
		}
	});
// Configure timeout to 1 hour
server.on('connection', socket => socket.setTimeout(60 * 60 * 1000));
//start server
server.listen(PORT, () => logger.info(`Server set up on port <${PORT}>`))
// Capture SIGINT
process.on("SIGINT", () => {
	if (process.stdout.isTTY) process.stdout.cursorTo(0);
	logger.warn("Received SIG_INT, exiting...");
	process.exit(0);
})
