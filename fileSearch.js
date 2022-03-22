const fs = require("fs");
const pdf = require("pdf-parse");


async function checkFile(path) {
	return new Promise((resolve, reject) => {
		const dataBuffer = fs.readFileSync(path);

		pdf(dataBuffer).then(data => {
			const text = data.text.toLowerCase();

			const isTest = text.includes("kód testu");
			const is1403 = isTest && text.includes("1403");
			//const is2020 = isTest && text.includes("maturita 2020");
			//const is2022 = isTest && text.includes("maturita 2022");
			//const year = isTest && text.match(/2\d{3}/);

			resolve({isTest, is1403/* is2020, is2022, year */});
		}).catch(err => {
			//console.log(`Error while parsing PDF:`, {err, path});
			reject(err);
		});
	});
}

async function main() {
	const files = fs.readdirSync(__dirname + "/named");
	const results = [];

	for(const file of files) {
		if(!file.endsWith(".pdf")) continue;

		const path = __dirname + "/named/" + file;
		const result = await checkFile(path).catch(err => null);
		if(!result) {
			continue;
		}

		console.log(`${file}:`, result);
		if(result.is1403) {
			console.log(`[!!!] ${file} FOUND!`, 1403);
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

module.exports = {
	checkFile
};