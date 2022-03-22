const fs = require("fs");
//const pdf = require("pdf-parse");


function peek(filePath, size, max = size, encoding = "utf8") {
	return new Promise((resolve, reject) => {
		const stream = fs.createReadStream(filePath, {encoding});

		let length = 0;
		let content = "";

		stream.on("readable", () => {
			let chunk;
			while(length < max && (chunk = stream.read(size)) !== null) {
				length += chunk.length;
				content += chunk.toString();

				if((length + size) >= max) {
					size = max - length;
				}
			}

			return resolve({
				length,
				content
			});
		});
	});
}

async function checkFile(path) {
	return new Promise((resolve, reject) => {
		const dataBuffer = fs.readFileSync(path);

		pdf(dataBuffer).then(data => {
			const text = data.text.toLowerCase();

			const isTest = text.includes("kód testu");
			const is2020 = isTest && text.includes("maturita 2020");
			const is2022 = isTest && text.includes("maturita 2022");
			const year = isTest && text.match(/2\d{3}/);

			resolve({isTest, is2020, is2022, year});
		}).catch(err => {
			//console.log(`Error while parsing PDF:`, {err, path});
			reject(err);
		});
	});
}

function copySync(from, to) {
	if(fs.existsSync(to)) return;
	fs.cpSync(from, to);
}


async function main() {
	// const data = await peek(__dirname + "/results/4671", 32);



	// console.log(data);

	// return;

	const date = Date.now();
	const files = fs.readdirSync(__dirname + "/files");
	const results = [];

	let not_found = 0;

	for(const file of files) {
		const path = __dirname + "/files/" + file;
		const data = await peek(path, 32);

		if(fs.existsSync(__dirname + "/typed/" + file)) continue;

		if(data.content.startsWith("%PDF")) {
			console.log(`[${file}] Type found: PDF`);
			copySync(path, __dirname + "/typed/" + file + ".pdf");
		} else if(data.content.startsWith("PK")) {
			console.log(`[${file}] Type found: ZIP`);
			copySync(path, __dirname + "/typed/" + file + ".zip");
		} else if(data.content.startsWith("Rar!")) {
			console.log(`[${file}] Type found: RAR`);
			copySync(path, __dirname + "/typed/" + file + ".rar");
		} else if(data.content.slice(1).startsWith("PNG")) {
			console.log(`[${file}] Type found: PNG`);
			copySync(path, __dirname + "/typed/" + file + ".png");
		} else if(data.content.toLowerCase().startsWith("<!DOCTYPE HTML")) {
			console.log(`[${file}] Type found: HTML`);
			copySync(path, __dirname + "/typed/" + file + ".html");
		} else if(data.content.startsWith("MZ")) {
			console.log(`[${file}] Type found: EXE`);
			copySync(path, __dirname + "/typed/" + file + ".exe");
		} else if(data.content.startsWith("ID3")) {
			console.log(`[${file}] Type found: MP3`);
			copySync(path, __dirname + "/typed/" + file + ".mp3");
		} else if(data.content.startsWith("$FL2@(#)")) {
			console.log(`[${file}] Type found: SAV`);
			copySync(path, __dirname + "/typed/" + file + ".sav");
		} else if(data.content.startsWith("\xFF\xFBPd")) {
			console.log(`[${file}] Type found: MP3`);
			copySync(path, __dirname + "/typed/" + file + ".mp3");
		} else if(data.content.startsWith("��")) {
			console.log(`[${file}] Type found: DOC`);
			copySync(path, __dirname + "/typed/" + file + ".doc");
		} else if(data.content.startsWith("{")) {
			try {
				JSON.parse(data.content);
				console.log(`[${file}] Type found: JSON`);
				copySync(path, __dirname + "/typed/" + file + ".json");
			} catch(err) { }
		} else {
			not_found++;
			console.log(`[${file}] Type not found!`, {data});
		}


		//console.log(results);
	}

	console.log(`Done in ${(Math.floor(Date.now() - date) * 1000)}s.`, {not_found});
}

main();