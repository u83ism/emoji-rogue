import type { Rng } from "../../rng.js";
import {
	AQUATOR_SPAWN_CHANCE_PERCENT,
	CENTAUR_SPAWN_CHANCE_PERCENT,
	calculateEnemyCountForFloor,
	DRAGON_SPAWN_CHANCE_PERCENT,
	EMU_SPAWN_CHANCE_PERCENT,
	ENEMY_MAX_HP,
	GRIFFIN_MIN_SPAWN_FLOOR,
	GRIFFIN_SPAWN_CHANCE_PERCENT,
	HOBGOBLIN_SPAWN_CHANCE_PERCENT,
	ICKY_THING_SPAWN_CHANCE_PERCENT,
	JABBERWOCK_MIN_SPAWN_FLOOR,
	JABBERWOCK_SPAWN_CHANCE_PERCENT,
	KESTREL_SPAWN_CHANCE_PERCENT,
	MEDUSA_MIN_SPAWN_FLOOR,
	MEDUSA_SPAWN_CHANCE_PERCENT,
	NYMPH_SPAWN_CHANCE_PERCENT,
	ORC_SPAWN_CHANCE_PERCENT,
	PHANTOM_MIN_SPAWN_FLOOR,
	PHANTOM_SPAWN_CHANCE_PERCENT,
	QUAGGA_SPAWN_CHANCE_PERCENT,
	RAT_SPAWN_CHANCE_PERCENT,
	SNAKE_SPAWN_CHANCE_PERCENT,
	THIEF_SPAWN_CHANCE_PERCENT,
	TROLL_MIN_SPAWN_FLOOR,
	TROLL_SPAWN_CHANCE_PERCENT,
	UR_VILE_SPAWN_CHANCE_PERCENT,
	VAMPIRE_MIN_SPAWN_FLOOR,
	VAMPIRE_SPAWN_CHANCE_PERCENT,
	VENUS_FLYTRAP_SPAWN_CHANCE_PERCENT,
	WRAITH_MIN_SPAWN_FLOOR,
	WRAITH_SPAWN_CHANCE_PERCENT,
	XEROC_SPAWN_CHANCE_PERCENT,
	YETI_SPAWN_CHANCE_PERCENT,
} from "../balance.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, Position } from "../state.js";
import { drawSpawnTile, type SpawnChance } from "./spawnPool.js";

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
	{ kind: "rat", chancePercent: RAT_SPAWN_CHANCE_PERCENT },
	{ kind: "emu", chancePercent: EMU_SPAWN_CHANCE_PERCENT },
	{ kind: "kestrel", chancePercent: KESTREL_SPAWN_CHANCE_PERCENT },
	{ kind: "hobgoblin", chancePercent: HOBGOBLIN_SPAWN_CHANCE_PERCENT },
	{ kind: "centaur", chancePercent: CENTAUR_SPAWN_CHANCE_PERCENT },
	{ kind: "quagga", chancePercent: QUAGGA_SPAWN_CHANCE_PERCENT },
	{ kind: "ur-vile", chancePercent: UR_VILE_SPAWN_CHANCE_PERCENT },
	{
		kind: "jabberwock",
		chancePercent: JABBERWOCK_SPAWN_CHANCE_PERCENT,
		minFloor: JABBERWOCK_MIN_SPAWN_FLOOR,
	},
	{
		kind: "griffin",
		chancePercent: GRIFFIN_SPAWN_CHANCE_PERCENT,
		minFloor: GRIFFIN_MIN_SPAWN_FLOOR,
	},
	{
		kind: "troll",
		chancePercent: TROLL_SPAWN_CHANCE_PERCENT,
		minFloor: TROLL_MIN_SPAWN_FLOOR,
	},
	{ kind: "icky-thing", chancePercent: ICKY_THING_SPAWN_CHANCE_PERCENT },
	{ kind: "venus-flytrap", chancePercent: VENUS_FLYTRAP_SPAWN_CHANCE_PERCENT },
	{
		kind: "medusa",
		chancePercent: MEDUSA_SPAWN_CHANCE_PERCENT,
		minFloor: MEDUSA_MIN_SPAWN_FLOOR,
	},
	{
		kind: "phantom",
		chancePercent: PHANTOM_SPAWN_CHANCE_PERCENT,
		minFloor: PHANTOM_MIN_SPAWN_FLOOR,
	},
	{
		kind: "wraith",
		chancePercent: WRAITH_SPAWN_CHANCE_PERCENT,
		minFloor: WRAITH_MIN_SPAWN_FLOOR,
	},
	{ kind: "xeroc", chancePercent: XEROC_SPAWN_CHANCE_PERCENT },
];

/**
 * Every enemy on a fresh floor, drawn from (and removed from) `pool` by
 * consuming `rng`: zombies and bats scaling with depth, then the
 * chance-rolled kinds of ENEMY_SPAWN_TABLE (vampire's roll is skipped, without
 * consuming rng, below its minFloor — see VAMPIRE_MIN_SPAWN_FLOOR). All spawn
 * asleep.
 */
export const drawFloorEnemies = (
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
	return enemies;
};
