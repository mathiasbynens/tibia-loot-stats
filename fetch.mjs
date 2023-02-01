import * as fs from 'node:fs/promises';
import jsesc from 'jsesc';

import { creatures, toPrettyName } from './creatures.mjs';

const handleCreature = async (slug) => {
	const url = `https://tibia.fandom.com/api.php?action=query&gaplimit=5&prop=revisions&rvprop=content&format=json&titles=Loot_Statistics:${slug}`;
	const response = await fetch(url);
	const data = await response.json();
	const pages = data.query.pages;
	const firstKey = Object.keys(pages)[0];
	const firstPage = pages[firstKey];
	if (!Object.hasOwn(firstPage, 'revisions')) {
		console.log('Missing `revisions` for', url);
		return {};
	}
	const revision = firstPage.revisions[0];
	const content = revision['*'];
	const lines = content.split('\n');
	const result = {
		monsterName: '',
		timesKilled: 0,
		items: [], // { itemName: '', timesDropped: 0 }
	};
	for (const line of lines) {
		if (line.startsWith('}}')) break; // End of Loot2 block.
		if (!line.startsWith('|')) continue;
		if (line.startsWith('|version=')) continue;
		if (line.startsWith('|Light=')) continue;
		if (line.startsWith('|Empty,')) continue;
		if (line.startsWith('|kills=')) {
			result.timesKilled = Number(line.replace('|kills=', ''));
		} else if (line.startsWith('|name=')) {
			result.monsterName = line.replace('|name=', '');
		} else {
			const parts = line.slice(1).split(', ');
			if (!parts[1]) console.log(`Missing parts for `, url, line, parts);
			const itemName = parts[0].replaceAll('[[', '').replaceAll(']]', '');
			const timesDropped = Number(parts[1].replace('times:', ''));
			result.items.push({
				itemName,
				timesDropped,
				dropRate: timesDropped / result.timesKilled,
			});
		}
	}
	return result;
};

const writeJsonFile = async (fileName, data) => {
	const json = jsesc(data, {
		compact: false,
		json: true,
	});
	await fs.writeFile(fileName, `${json}\n`);
};

const creatureToLootMap = new Map();
for (const creature of creatures) {
	const prettyName = toPrettyName(creature);
	const slug = creature.replaceAll(' ', '_');
	const result = await handleCreature(slug);
	await writeJsonFile(`./data/${slug}.json`, result);

	const lootToDropRateObject = {};
	for (const item of result.items) {
		lootToDropRateObject[item.itemName] = item.dropRate;
	}
	creatureToLootMap.set(prettyName, lootToDropRateObject);
}
await writeJsonFile(`./data/_all.json`, Object.fromEntries(creatureToLootMap));

// const result = await handleCreature('Barbarian_Brutetamer');
// console.log(result);
