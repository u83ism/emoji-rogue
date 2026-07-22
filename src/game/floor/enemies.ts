import { at } from "../../indexing.js";
import type { Room } from "../../map/features.js";
import type { Rng } from "../../rng.js";
import {
	AQUATOR_SPAWN_CHANCE_PERCENT,
	calculateEnemyCountForFloor,
	DRAGON_SPAWN_CHANCE_PERCENT,
	ENEMY_MAX_HP,
	MONSTER_HOUSE_ENEMY_COUNT,
	MONSTER_HOUSE_SPAWN_CHANCE_PERCENT,
	NYMPH_SPAWN_CHANCE_PERCENT,
	ORC_SPAWN_CHANCE_PERCENT,
	SNAKE_SPAWN_CHANCE_PERCENT,
	THIEF_SPAWN_CHANCE_PERCENT,
	VAMPIRE_MIN_SPAWN_FLOOR,
	VAMPIRE_SPAWN_CHANCE_PERCENT,
	YETI_SPAWN_CHANCE_PERCENT,
} from "../balance.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, Position } from "../state.js";
import {
	drawSpawnTile,
	drawSpawnTileInRoom,
	type SpawnChance,
} from "./spawnPool.js";

/**
 * Chance-rolled enemies — thief/nymph/aquator, which never scale with depth
 * (zombie/bat counts come from calculateEnemyCountForFloor instead). Array
 * order is the exact order the rolls consume `rng`: reordering entries would
 * change every seeded dungeon, so new kinds go at the end.
 */
const ENEMY_SPAWN_TABLE: readonly SpawnChance<EnemyKind>[] = [
	{ kind: "thief", chancePercent: THIEF_SPAWN_CHANCE_PERCENT },
	{ kind: "nymph", chancePercent: NYMPH_SPAWN_CHANCE_PERCENT },
	{ kind: "aquator", chancePercent: AQUATOR_SPAWN_CHANCE_PERCENT },
	{ kind: "orc", chancePercent: ORC_SPAWN_CHANCE_PERCENT },
	{ kind: "dragon", chancePercent: DRAGON_SPAWN_CHANCE_PERCENT },
	{ kind: "yeti", chancePercent: YETI_SPAWN_CHANCE_PERCENT },
	{ kind: "snake", chancePercent: SNAKE_SPAWN_CHANCE_PERCENT },
	{
		kind: "vampire",
		chancePercent: VAMPIRE_SPAWN_CHANCE_PERCENT,
		minFloor: VAMPIRE_MIN_SPAWN_FLOOR,
	},
];

/**
 * Every enemy on a fresh floor, drawn from (and removed from) `pool` by
 * consuming `rng`: zombies and bats scaling with depth, then the
 * chance-rolled kinds of ENEMY_SPAWN_TABLE (vampire's roll is skipped, without
 * consuming rng, below its minFloor — see VAMPIRE_MIN_SPAWN_FLOOR) — all
 * asleep — and finally,
 * on a MONSTER_HOUSE_SPAWN_CHANCE_PERCENT roll, a monster house: a whole
 * extra room's worth of already-awake zombies/bats dumped into one room
 * other than the player's starting room. Walking in is an ambush, not a
 * sneak-attack opportunity.
 */
export const drawFloorEnemies = (
	rooms: readonly Room[],
	firstRoom: Room,
	pool: Position[],
	rng: Rng,
	floor: number,
): Enemy[] => {
	const enemies: Enemy[] = [];
	const zombieCount = calculateEnemyCountForFloor("zombie", floor);
	for (let i = 0; i < zombieCount && pool.length > 0; i++) {
		enemies.push({
			...drawSpawnTile(pool, rng),
			kind: "zombie",
			hp: ENEMY_MAX_HP.zombie,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		});
	}
	const batCount = calculateEnemyCountForFloor("bat", floor);
	for (let i = 0; i < batCount && pool.length > 0; i++) {
		enemies.push({
			...drawSpawnTile(pool, rng),
			kind: "bat",
			hp: ENEMY_MAX_HP.bat,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		});
	}
	for (const spawn of ENEMY_SPAWN_TABLE) {
		if (spawn.minFloor !== undefined && floor < spawn.minFloor) {
			continue;
		}
		if (pool.length > 0 && rng.getUniformInt(0, 99) < spawn.chancePercent) {
			enemies.push({
				...drawSpawnTile(pool, rng),
				kind: spawn.kind,
				hp: ENEMY_MAX_HP[spawn.kind],
				awake: false,
				slowedTurnsRemaining: 0,
				confusedTurnsRemaining: 0,
			});
		}
	}

	const otherRooms = rooms.filter((room) => room !== firstRoom);
	if (
		otherRooms.length > 0 &&
		pool.length > 0 &&
		rng.getUniformInt(0, 99) < MONSTER_HOUSE_SPAWN_CHANCE_PERCENT
	) {
		const monsterHouseRoom = at(
			otherRooms,
			rng.getUniformInt(0, otherRooms.length - 1),
		);
		for (let i = 0; i < MONSTER_HOUSE_ENEMY_COUNT; i++) {
			const tile = drawSpawnTileInRoom(pool, monsterHouseRoom, rng);
			if (tile === undefined) {
				break;
			}
			const kind = i % 2 === 0 ? "zombie" : "bat";
			enemies.push({
				...tile,
				kind,
				hp: ENEMY_MAX_HP[kind],
				awake: true,
				slowedTurnsRemaining: 0,
				confusedTurnsRemaining: 0,
			});
		}
	}
	return enemies;
};
