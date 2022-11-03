export function matchDevice(list, target) {
	for (const device of list) {
		// Only check device if has string property 'path'
		if (typeof device?.path !== 'string') continue;
		// Check if device matches target
		let flag = true;
		for (const key in target) {
			if (target[key] !== device?.[key]) {
				flag = false;
				break;
			}
		}
		if (flag) return device.path;
	}
	return;
}