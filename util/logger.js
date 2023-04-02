import { createLogger, format, transports } from 'winston';
import { LOG_FILE_STREAM } from './env.js';
import color from 'colors/safe.js';
import WebsocketTransport from './websocket.js';

const
	levels = {
		verbose: 0,
		info: 1,
		warn: 2,
		error: 3,
		panic: 4
	},
	levelScheme = {
		verbose: s => color.italic(color.green(s)),
		info: color.cyan,
		warn: color.yellow,
		error: color.red,
		panic: s => color.bold((color.underline(color.red(s))))
	},
	levelNames = {
		verbose: ':verbose',
		info   : ':info   ',
		warn   : ':warn   ',
		error  : ':error  ',
		panic  : ':panic  '
	};

const colorize = process.stdout.isTTY
	? ({ timestamp = '', src = 'server', level, message, ...info }) => {
		const
			_scheme = levelScheme[level] ?? (s => s.toString()),
			scheme = src == 'driver'
				? s => color.dim(_scheme(s))
				: _scheme;
		return {
			timestamp: color.dim(timestamp.toString()),
			src: scheme(src),
			level: scheme(levelNames[level] ?? `:${level}`),
			message: scheme(message),
			...info
		}
	}
	: ({level, ...info}) => ({level: `:${level}`, ...info})

const consoleFormatter = format.combine(
	format.timestamp({
		format: "YYYY-MM-DD HH:mm:ss"
	}),
	{ transform: colorize },
	format.printf(
		({ timestamp, level, message, src = 'server' }) => `${timestamp} ${src}${level} ${message}`
	)
);

const fileStreamFormatter = format.combine(
	format.timestamp({
		format: "YYYY-MM-DD HH:mm:ss"
	}),
	format.printf(
		({ timestamp, level, message, src = 'server' }) => `${timestamp} [${src}:${level}] ${message}`
	)
);

export const websocketTransport = new WebsocketTransport({
	format: format.timestamp({
		format: "YYYY-MM-DD HH:mm:ss"
	})
});

export default createLogger({
	level: 0,
	levels,
	transports: [
		new transports.Console({
			format: consoleFormatter
		}),
		new transports.Stream({
			stream: LOG_FILE_STREAM,
			format: fileStreamFormatter
		}),
		websocketTransport
	]
})