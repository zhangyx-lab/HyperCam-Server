import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
// Project ROOT
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Initialize var directory
export const VAR = resolve(ROOT, 'var');
if (!existsSync(VAR)) {
	mkdirSync(VAR);
} else if (!lstatSync(VAR).isDirectory()) {
	throw new Error(`VAR path ${VAR} has been occupied by a regular file.`);
}
// Initialize JSON config
const CONFIG_PATH = resolve(VAR, 'config.json');
if (!existsSync(CONFIG_PATH)) {
	console.error(`Unable to load configuration from ${CONFIG_PATH}`);
	console.log(`Creating template config.json ...`);
	writeFileSync(CONFIG_PATH, JSON.stringify({
		driver: "path/to/driver.py",
		port: 8080
	}), null, '\t');
}
const CONFIG = JSON.parse(readFileSync(CONFIG_PATH).toString())
// Initialize Driver Config
export const DRIVER_PATH = CONFIG?.driver;
if (typeof DRIVER_PATH !== 'string' || !existsSync(DRIVER_PATH))
	throw new Error(`Invalid Driver "${DRIVER_PATH}"`);
export const DRIVER_ARGS = Object.freeze(CONFIG?.driverArgs ?? [])
// Initialize Server Parameters
export const PORT = CONFIG?.port ?? 8080;
export const WEB_STATIC_PATH = resolve(VAR, 'web');
export const WEB_STATIC_ENABLE = existsSync(WEB_STATIC_PATH);
