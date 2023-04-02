
// NodeJS Modules
import { realIP } from './util.js';
// NPM Packages
import express from "express";
// Project Libraries
import { WEB_STATIC_PATH } from './env.js';
import logger from './logger.js';
import capture from './capture.js';
// Export express server instance
export default express()
	// Remove express powered-by header
	.disable('x-powered-by')
	.use((req, res, next) => {
		logger.verbose(req.url);
		res.setHeader('Access-Control-Allow-Origin', '*');
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
	.use('/capture', capture)
	// Static content server
	.use(express.static(WEB_STATIC_PATH))
	// PWA Compliant
	.use((req, res, next) => res.redirect('/'))
	// Error Handler
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
	})