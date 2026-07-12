const path = require("path");
const puppeteer = require("puppeteer-core");

(async () => {
	async function onConsole(msg) {
		const args = msg.args();
		const value = await args[0].jsonValue();
		const passed = value.passedExpectations || [];
		const failed = value.failedExpectations || [];
		for (let i = 0; i < passed.length; i++) {
			process.stdout.write(".");
		}
		failed.length && console.log(failed);
		const status = value["overallStatus"];
		if (!status) {
			return;
		}

		console.log(status);
		process.exitCode = status == "passed" ? 0 : 1;
		browser.close();
	}

	const browser = await puppeteer.launch({
		executablePath: "/usr/bin/google-chrome",
	});
	const page = await browser.newPage();
	const url = `file://${path.dirname(module.filename)}/index.html`;

	page.on("console", onConsole);
	page.goto(url);
})();
