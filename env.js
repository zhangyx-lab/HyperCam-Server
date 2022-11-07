import { existsSync, lstatSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
// Project ROOT
export const ROOT = dirname(fileURLToPath(import.meta.url));
// Initialize JSON config
const
	USER_CONF_PATH = resolve(ROOT, 'config.json'),
	USER_CONF = existsSync(USER_CONF_PATH)
		? JSON.parse(readFileSync(USER_CONF_PATH).toString())
		: {};
// Initialize var directory
export const VAR = USER_CONF?.varPath ?? resolve(ROOT, 'var');
if (!existsSync(VAR)) {
	mkdirSync(VAR);
} else if (!lstatSync(VAR).isDirectory()) {
	throw new Error(`VAR path ${VAR} has been occupied by a regular file.`);
}
// Initialize Device Info
export const CONTROLLER_TARGET =
	USER_CONF?.controller ?? {
		vendorId: "f055",
		productId: "0001"
	};
// Initialize Driver Path
export const DRIVER_PATH = USER_CONF?.driverPath;
if (typeof DRIVER_PATH !== 'string' || !existsSync(DRIVER_PATH))
	throw new Error(`Invalid Camera Driver "${DRIVER_PATH}"`);
// Initialize Server Parameters
export const PORT = USER_CONF?.port ?? 80;
