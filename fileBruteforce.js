const fs = require("fs");
const https = require("https");
const {timeout, map} = require("../JustLib.js");

const TIMEOUT = 500;

const FROM = 1636 - 2;
const TO = 1636 + 2;//6000;
const ENDPOINT = "https://www.nucem.sk/dl/";
const STATS = {
	success: 0,
	failure: 0,
};

async function pipeToFile(readable, index) {
	const writable = fs.createWriteStream(__dirname + `/files/${index}`);

	return new Promise((resolve, reject) => {
		readable.pipe(writable);
		readable.on("end", () => {
			resolve(true);
		});
		readable.on("error", (err) => {
			reject(err);
		});
	});
}

async function handleJSON(readable) {
	return new Promise((resolve, reject) => {
		let buffer = "";

		readable.on("data", chunk => {
			buffer += chunk;
		});

		readable.on("end", () => {
			try {
				resolve(JSON.parse(buffer));
			} catch(err) {
				console.log(`Error while parsing JSON: ${err}`, {buffer});
				reject(err);
			}
		});
	});
}

async function main() {
	for(var i = FROM; i < TO + 1; i++) {

		await new Promise(async (resolve, reject) => {
			process.stdout.write(`[${i}/${TO} ${map(i, FROM, TO, 0, 100).toFixed(2)}%] Fetching | `);

			https.get(ENDPOINT + i, async res => {
				const status = res.statusCode;

				if(status === 200) STATS.success++;
				else STATS.failure++;

				process.stdout.write(`${status} | `);

				if(status === 200) {
					process.stdout.write(`downloading | `);
					const saved = await pipeToFile(res, i).catch(err => reject(err)); if(!saved) return;
					process.stdout.write(`done`);
				} else if(status === 404) {
					process.stdout.write("skipping");
				} else {
					const json = await handleJSON(res).catch(err => reject(err)); if(!json) return;
					process.stdout.write(`${json.message} | status: ${json.statusCode} | error: ${json.errorCode} `);
				}

				resolve();
			});
		}).catch(err => {
			console.log("Error while requesting resources:", err);
		});

		process.stdout.write("\n");
		await timeout(TIMEOUT);
	}

	console.log("Stats:", {
		success: STATS.success,
		failure: STATS.failure,
		success_rate: STATS.success / (STATS.success + STATS.failure)
	});
}

main();