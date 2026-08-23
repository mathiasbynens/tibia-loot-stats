import { uglyToPrettyNames } from './creatures.mjs';

const response = await fetch(
	'https://raw.githubusercontent.com/mathiasbynens/tibia-json/refs/heads/main/data/bestiary.json',
);
const data = await response.json();

for (const creature of data) {
	const name = creature.name;
	if (uglyToPrettyNames.has(name)) {
		continue;
	}
	const uglyName = name;
	const prettyName = name.toLowerCase();
	console.log(
		`\t[${JSON.stringify(uglyName)}, ${JSON.stringify(prettyName)}],`,
	);
}
