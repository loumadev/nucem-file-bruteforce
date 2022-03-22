const fs = require("fs");
const https = require("https");
const {timeout, map} = require("../JustLib.js");
const {checkFile} = require("./fileSearch.js");

const TIMEOUT = 500;

const FROM = 2374;//600;//612;//1636 - 2;
const TO = 5200;//1636 + 2;//6000;
const ENDPOINT = "https://www.nucem.sk/dl/";
const STATS = {
	success: [],
	failure: [],
	found: [],
	not_privileged: [],
	new: []
};

const PATH_FILES = __dirname + "/files/";
const PATH_RESULTS = __dirname + "/results/";
const PATH_NAMED = __dirname + "/named/";

async function pipeToFile(readable, filename) {
	const writable = fs.createWriteStream(PATH_NAMED + filename);

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

function createDirectory(dir) {
	if(!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

async function main() {
	createDirectory(PATH_FILES);
	createDirectory(PATH_RESULTS);

	for(var i = FROM; i < TO + 1; i++) {

		await new Promise(async (resolve, reject) => {
			process.stdout.write(`[${i}/${TO} ${map(i, FROM, TO, 0, 100).toFixed(2)}%] Fetching`);

			https.get(ENDPOINT + i, async res => {
				const status = res.statusCode;

				if(status === 200) STATS.success.push(i);
				else STATS.failure.push(i);

				process.stdout.write(` | ${status}`);

				if(status === 200) {
					const header = res.headers["content-disposition"];
					// if(!header) {
					// 	console.log(res.headers);
					// 	process.exit(1);
					// }
					const filename = decodeURIComponent(header.match(/filename="(.*)"/)[1]);
					const fs_filename = i + "__" + filename.replace(/\/|\\/g, "__");

					if(fs.existsSync(PATH_NAMED + fs_filename)) {
						process.stdout.write(` | file ${filename} already downloaded`);

						resolve();
						return;
					} else {

						process.stdout.write(` | downloading ${filename}`);
						const saved = await pipeToFile(res, fs_filename).catch(err => reject(err)); if(!saved) return;
						process.stdout.write(` | done`);

						STATS.new.push(fs_filename);



						resolve();
						return;

						const o_console_log = console.log;
						console.log = () => { };

						process.stdout.write(` | scanning`);
						const result = await checkFile(PATH_FILES + i).catch(err => {
							process.stdout.write(" | " + err.message);
							resolve();
							return 0;
						});
						console.log = o_console_log;
						if(!result) return;

						if(result.is2020 || result.is2022) {
							process.stdout.write(` | found 2020/2022`);
							process.stdout.write(`\n[!!!] ${i} FOUND 2020/2022!!!`);
							fs.cpSync(PATH_FILES + i, PATH_RESULTS + i);
						} else if(result.isTest) {
							process.stdout.write(` | test ${result.year}`);
						} else {
							process.stdout.write(` | none`);
						}
					}
				} else if(status === 404) {
					process.stdout.write(" | skipping");
				} else {
					const json = await handleJSON(res).catch(err => reject(err)); if(!json) return;
					process.stdout.write(` | ${json.message} | status: ${json.statusCode} | error: ${json.errorCode} `);

					if(json.errorCode == 0) {
						STATS.not_privileged.push(i);
					}
				}

				resolve();
			});
		}).catch(err => {
			console.log("Error while requesting resources:", err);
		});

		process.stdout.write("\n");
		//await timeout(TIMEOUT);
	}

	console.log("Stats:", {
		success: STATS.success.length,
		failure: STATS.failure.length,
		found: STATS.found.length,
		not_privileged: STATS.not_privileged.length,
		success_rate: STATS.success.length / (STATS.success.length + STATS.failure.length),
		new: STATS.new
	});

	fs.writeFileSync(__dirname + "/stats.json", JSON.stringify(STATS));
}

main();