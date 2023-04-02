import TransportStream from "winston-transport";

class WebsocketTransport extends TransportStream {
	/**
	 * @type {import('ws').WebSocket[]}
	 */
	#wsList = [];
	constructor(options) {
		super(options)
	}
	/**
	 * 
	 * @param {Object} info 
	 * @param {Function} callback 
	 */
	log(info, callback) {
		// Send to all listeners
		for (const ws of this.#wsList) {
			try {
				ws.send(JSON.stringify({src: 'server', ...info}) + '\n');
			} catch (e) {
				console.error(`Error logging to websocket: ${e}`);
			}
		}
		// Given by winston
		callback();
	}
	/**
	 * Register websocket connection to list
	 * @param {import('ws').WebSocket} ws 
	 */
	register(ws) {
		ws.readyState
		this.#wsList.push(ws);
		ws.on('close', () => {
			this.#wsList = this.#wsList.filter(e => e !== ws)
		});
	}
}

export default WebsocketTransport;