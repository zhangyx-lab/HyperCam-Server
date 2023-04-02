// Internal library
import { createServer } from 'http';
// NPM Package
import { WebSocketServer } from 'ws';
// Project dependencies
import { PORT } from './util/env.js';
import { realIP } from './util/util.js';
import logger, { websocketTransport } from './util/logger.js';
import express from './util/express.js';
// Startup message
logger.info(`Server launched with PID ${process.pid}`);
// Initialize websocket Server
const wsServer = new WebSocketServer({ noServer: true });
// configure websocket server
wsServer.on('connection', (socket, request) => {
	console.log(request.constructor.name, Object.keys(request))
	console.log(socket.constructor.name, Object.keys(socket))
	websocketTransport.register(socket);
	logger.info(`Websocket ${request.url} connected from ${realIP(request)}`);
});
// Create server
const server = createServer();
// Upgrade HTTP requests to WebSocket connections
server.on('upgrade', (request, socket, head) => {
	wsServer.handleUpgrade(
		request, socket, head,
		(...args) => wsServer.emit('connection', ...args)
	);
});
// Handle normal requests
server.on('request', (req, res) => express.handle(req, res));
//start server
server.listen(PORT, () => logger.info(`Server listen on port <${PORT}>`))
// Capture SIGINT
process.on("SIGINT", () => {
	if (process.stdout.isTTY) process.stdout.cursorTo(0);
	logger.warn("Received SIG_INT, exiting...");
	process.exit(0);
})
