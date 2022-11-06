export function COMBINE(...commands) {
	return commands.map(cmd => `${cmd}\n`).join('');
}

export function LED(index) {
	if (index < 1 || index > 8)
		throw new Error(`[LED] Index ${index} out of range`);
	return {
		ON: `LED ${index} 128`,
		OFF: `LED ${index} 0`,
	};
}

export function WAIT(time) {
	if (time < 0)
		throw new Error(`[WAIT] Time period has to be positive`);
	let time_ns = Math.round(time * 1000);
	return `WAIT ${time_ns}`;
}

export function RST() {
	return `RST`
}