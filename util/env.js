import fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dateTime from 'date-and-time';
import { exit } from 'process';
// Launch time
export const LAUNCH_TIME = new Date();
// Project ROOT
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Initialize directories
export const [VAR, TMP, LOG_PATH] = ['var', 'var/tmp', 'var/log'].map(dir => {
	const path = resolve(ROOT, dir);
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	} else if (!fs.lstatSync(path).isDirectory()) {
		throw new Error(`Path "${path}" has been occupied by a regular file.`);
	}
	return path;
})
// Initialize JSON config
const CONFIG_PATH = resolve(VAR, 'config.json');
if (!fs.existsSync(CONFIG_PATH)) {
	console.error(`Unable to load configuration from ${CONFIG_PATH}`);
	console.log(`Creating template config.json ...`);
	fs.writeFileSync(CONFIG_PATH, JSON.stringify({
		driver: "path/to/driver.py",
		port: 8080
	}), null, '\t');
	process.exit(1);
}
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH).toString())
// Initialize Driver Config
export const DRIVER_PATH = CONFIG?.driver;
if (typeof DRIVER_PATH !== 'string' || !fs.existsSync(DRIVER_PATH)) {
	console.error(`Configuration Error: Invalid Driver "${DRIVER_PATH}"`);
	exit(1);
}
export const DRIVER_ARGS = Object.freeze(CONFIG?.driverArgs ?? [])
// Initialize Server Parameters
export const PORT = CONFIG?.port ?? 8080;
export const WEB_STATIC_PATH = resolve(VAR, 'web');
export const WEB_STATIC_ENABLE = fs.existsSync(WEB_STATIC_PATH);
// Initialize logger file stream
const LOG_FILE_PATH = resolve(
	LOG_PATH,
	`${dateTime.format(LAUNCH_TIME, "YYYY-MM-DD_HH:mm:ss")}.log`
);
if (fs.existsSync(LOG_FILE_PATH)) {
	console.error(`Log file at "${LOG_FILE_PATH}" exists, aborting...`);
	process.exit(1);
}
export const LOG_FILE_STREAM = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });
// Create symlink from var/server.log to active log file
const LOG_SYMLINK = resolve(VAR, "server.log");
if (fs.existsSync(LOG_SYMLINK) && fs.lstatSync(LOG_SYMLINK).isSymbolicLink())
	fs.unlinkSync(LOG_SYMLINK);
fs.symlinkSync(LOG_FILE_PATH, LOG_SYMLINK, 'file');
