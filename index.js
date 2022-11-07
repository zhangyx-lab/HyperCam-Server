import Controller from './controller.js';
import { CONTROLLER_TARGET, ROOT } from './env.js';
const controller = new Controller(CONTROLLER_TARGET);
const unlock = await controller.getLock();
[1, 2, 3].map(i => controller.getLock(i).then(ul => {
	console.log(`${i}th lock resolved`);
	ul()
}))
console.log('====== DEVICE ACTIVE ======');
await controller
	.WAIT(0)
	.LED(1).PWM(64)
	.WAIT(1000)
	.RST()
	.commit()
console.log('====== COMMAND LOADED ======');
await controller.exec()
console.log('====== DONE ======');
unlock();
setImmediate(() => process.exit(0));