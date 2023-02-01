import * as fs from 'node:fs/promises';
import { prettyCreatureNames } from './creatures.mjs';

const getWorlds = async () => {
	const response = await fetch('https://api.tibiadata.com/v3/worlds');
	const data = await response.json();
	const regularWorlds = data.worlds.regular_worlds;
	const worldNames = regularWorlds.map((world) => world.name);
	return worldNames;
};

const getKillStatsForWorld = async (worldName) => {
	const response = await fetch(`https://raw.githubusercontent.com/tibiamaps/tibia-kill-stats/main/data/_yesterday/${worldName}.json`);
	const data = await response.json();
	const map = new Map(Object.entries(data));
	const filteredMap = new Map();
	for (const creature of prettyCreatureNames) {
		const killCount = map.get(creature);
		filteredMap.set(creature, killCount);
	}
	return {
		world: worldName,
		kills: filteredMap,
	};
};

const readLootStats = async () => {
	const json = await fs.readFile('./data/_all.json', 'utf8');
	const data = JSON.parse(json);
	return new Map(Object.entries(data));
};

const LOOT_STATS = await readLootStats();

const worldNames = await getWorlds();
// Kick off all requests in parallel.
const killStatsPerWorld = worldNames.map((worldName) => getKillStatsForWorld(worldName));

for await (const stats of killStatsPerWorld) {
	const {world, kills} = stats;
	const results = new Map();

	for (const [creature, itemsToDropChances] of LOOT_STATS) {
		const killCount = kills.get(creature);
		if (!killCount) continue;
		for (const [item, dropChance] of Object.entries(itemsToDropChances)) {
			//console.log({creature, killCount, item, dropChance})
			const drops = killCount * dropChance;
			if (results.has(item)) {
				const oldDrops = results.get(item);
				results.set(item, oldDrops + drops);
			} else {
				results.set(item, drops);
			}
		}
	}

	const object = Object.fromEntries([...results].sort((a, b) => b[1] - a[1]));
	const json = JSON.stringify(object, null, '\t');
	await fs.writeFile(`./data/items-yesterday/${world}.json`, `${json}\n`);
}
