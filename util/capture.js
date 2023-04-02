// NodeJS Modules
import { createReadStream, existsSync, unlink } from 'fs';
import { getUniqueName, toAsync } from './util.js';
import { resolve } from 'path';
// Project Libraries
import { TMP, DRIVER_PATH } from './env.js';
import logger from './logger.js';
import Driver from '../lib/Driver.js';
// Initialize driver
// const driver = new Driver(DRIVER_PATH);
// Export capture request handler
export default function capture(req, res, next) {
	// Configure timeout to 1 hour
	req.setTimeout(60 * 60_000);
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
}