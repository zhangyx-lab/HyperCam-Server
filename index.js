import Camera from './camera.js';
import Controller from './controller.js';
import { CONTROLLER_TARGET, DRIVER_OPTIONS, DRIVER_PATH, ROOT } from './env.js';
import Lockable from './lock.js';
const
	controller = new Controller(CONTROLLER_TARGET),
	camera = new Camera(DRIVER_PATH, DRIVER_OPTIONS),
	unlock = await Lockable.getLocks(
		controller,
		camera
	);
console.log('====== DEVICE ACTIVE ======');
await controller
	.WAIT(0)
	.LED(1).PWM(64)
	.WAIT(1000)
	.RST()
	.commit()
console.log('====== COMMAND LOADED ======');
await Promise.all([
	controller.exec(),
	camera.trigger()
])
console.log('====== DONE ======');
unlock();
setImmediate(() => process.exit(0));