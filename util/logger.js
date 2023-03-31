import { createLogger, format, transports } from 'winston';
export { WSTransport } from 'winston-websocket';

export const logger = createLogger({
	format: format.json(),
	level: ['verbose'],
	transports: [
		new transports.Console()
	]
})

const InfoRx = () => /^#\W?/g
let messageBuffer = ""

export function handleMessage(msg) {
	messageBuffer += msg.toString()
	while (true) {
		const index = messageBuffer.indexOf("\n");
		if (index < 0) break;
		const line = messageBuffer.slice(0, index)
		messageBuffer = messageBuffer.slice(index + 1)
		if (InfoRx().test(line))
			logger.info(line.replace(InfoRx(), '').trim())
		else
			logger.error(line.trim())
	}
}
