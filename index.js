import Controller from './controller.js';
import { CONTROLLER_TARGET, ROOT } from './env.js';
const controller = new Controller(CONTROLLER_TARGET);
const unlock = await controller.getLock();
console.log('====== DEVICE ACTIVE ======');
await controller
	.LED(1).PWM(64)
	.WAIT(1000)
	.RST()
	.commit()
console.log('====== COMMAND LOADED ======');
await controller.exec()
console.log('====== DONE ======');
process.exit(0);
