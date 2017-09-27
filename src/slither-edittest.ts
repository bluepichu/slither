import * as commander from "commander";
import * as cp from "mz/child_process";
import * as fs from "mz/fs";

import checkers from "./checkers";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const UP = (n: number) => `\x1b[${n}A`;
const DOWN = (n: number) => `\x1b[${n}B`;

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[39m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const CLEAR = "\x1b[0m";
const SNEK = "🐍  ";

const OK = "✓";
const WRONG_ANSWER = "✗";
const WAITING = "•";
const RUNNING = "•";
const TIME_LIMIT_EXCEEDED = "!";

function parseTests(val: string) {
	let parts = val.split(",");
	let tests = [];

	for (let part of parts) {
		if (part.indexOf("-") >= 0) { // range
			let [aStr, bStr] = part.split("-");
			let [a, b] = [parseInt(aStr), parseInt(bStr)];

			for (let i = a; i <= b; i++) {
				tests.push(i);
			}
		} else { // single number
			tests.push(parseInt(part));
		}
	}

	return tests;
}

let name: string;
let number: number;

commander
	.arguments("<set> <test>")
	.action((set: string, test: string) => {
		name = set;
		number = parseInt(test);
	})
	.parse(process.argv);

if (name === undefined || number === undefined) {
	console.error(`${RED}Missing test set name or test number.${CLEAR}`);
	process.exit(1);
} else {
	let configPrm = fs.readFile(".slither/config.json");

	configPrm.catch((err) => {
		console.error(`${RED}No Slither configuration found in the current directory.  Run ${WHITE}${BOLD}slither init${RED} first.${CLEAR}`);
		process.exit(1);
	});

	configPrm.then((data) => {
		let config = JSON.parse(data.toString()) as Config;
		let testset: Testset = config[name];

		if (!testset) {
			console.error(`${RED}No testset with the name "${name}" was found.${CLEAR}`);
			process.exit(1);
		}

		return fs.readdir(`.slither/${name}`)
			.then((files) => {
				if (files.indexOf(`${number}.in`) < 0) {
					console.error(`${RED}No test with that number was found for testset ${name}.${CLEAR}`);
					process.exit(1);
				}

				let editor = process.env.VISUAL || process.env.EDITOR || "vim";

				return exec(`${editor} .slither/${name}/${number}.in`, { shell: true, stdio: "inherit" })
					.then(() => exec(`${editor} .slither/${name}/${number}.out`, { shell: true, stdio: "inherit" }))
					.then(() => console.log(`${GREEN}Successfully edited test ${number} for testset ${name}.${CLEAR} ${SNEK}`))
					.catch((err) => console.error(`${RED}Failed to edit test ${number} on testset ${name}.${CLEAR}\n${JSON.stringify(err)}`));
			});
	});
}

function exec(cmd: string, options: cp.SpawnOptions): Promise<{ stdout: string, stderr: string, timeout?: boolean }> {
	return new Promise((resolve, reject) => {
		let parts = cmd.split(" ");
		let child = cp.spawn(parts[0], parts.slice(1), options);

		let stdout = "";
		let stderr = "";

		if (child.stdout) {
			child.stdout.on("data", (data) => stdout += data);
		}

		if (child.stderr) {
			child.stderr.on("data", (data) => stderr += data);
		}

		child.on("error", (err) => {
			reject({ stdout: "", stderr: "", error: err });
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				reject({ stdout, stderr });
			}
		});
	});
}
