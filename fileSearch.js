const fs = require("fs");
const pdf = require("pdf-parse");


async function checkFile(path) {
	return new Promise((resolve, reject) => {
		const dataBuffer = fs.readFileSync(path);

		pdf(dataBuffer).then(data => {
			const text = data.text.toLowerCase();

			const isTest = text.includes("kód testu");
			const is2020 = isTest && text.includes("maturita 2020");
			const is2022 = isTest && text.includes("maturita 2022");

			resolve({isTest, is2020, is2022});
		}).catch(err => {
			console.log(`Error while parsing PDF:`, {err, path});
			reject(err);
		});
	});
}

async function main() {
	const files = fs.readdirSync(__dirname + "/files");
	const results = [];

	for(const file of files) {
		const path = __dirname + "/files/" + file;
		const result = await checkFile(path).catch(err => null);
		if(!result) {
			continue;
		}

		console.log(`${file}:`, result);
		if(result.is2020 || result.is2022) {
			console.log(`[!!!] ${file} FOUND!`);
			fs.cpSync(path, __dirname + "/results/" + file);
		}

		results.push({
			path,
			result,
		});
	}

	//console.log(results);
}

main();