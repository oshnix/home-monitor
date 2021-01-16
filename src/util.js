async function wait(timeout) {
	await new Promise((resolve) => setTimeout(resolve, timeout));
}

module.exports = {
	wait,
}
