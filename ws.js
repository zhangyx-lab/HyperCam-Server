import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle normal HTTP requests
app.get('/', (req, res) => {
	res.send('Hello, world!');
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
	console.log('WebSocket connection established');

	ws.on('message', (message) => {
		console.log(`Received message: ${message}`);
		ws.send(`You said: ${message}`);
	});

	ws.on('close', () => {
		console.log('WebSocket connection closed');
	});
});

// Upgrade HTTP requests to WebSocket connections
server.on('upgrade', (request, socket, head) => {
	wss.handleUpgrade(request, socket, head, (socket) => {
		wss.emit('connection', socket, request);
	});
});

server.listen(8080, () => {
	console.log('Server listening on port 8080');
});
