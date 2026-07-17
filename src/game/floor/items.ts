import type { Rng } from "../../rng.js";
import {
	BLIND_POTION_SPAWN_CHANCE_PERCENT,
	CONFUSION_POTION_SPAWN_CHANCE_PERCENT,
	DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	FOOD_COUNT_PER_FLOOR,
	GOAL_FLOOR,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	GOLD_PILES_PER_FLOOR,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	LEVITATION_POTION_SPAWN_CHANCE_PERCENT,
	LIFE_POTION_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	PARALYSIS_POTION_SPAWN_CHANCE_PERCENT,
	POISON_POTION_SPAWN_CHANCE_PERCENT,
	POTION_COUNT_PER_FLOOR,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	RING_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
	SHIELD_SPAWN_CHANCE_PERCENT,
	SLOW_WAND_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_SPAWN_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	SWORD_SPAWN_CHANCE_PERCENT,
	TELEPORT_TRAP_SPAWN_CHANCE_PERCENT,
	TRAP_COUNT_PER_FLOOR,
	TRAPDOOR_SPAWN_CHANCE_PERCENT,
	WAND_SPAWN_CHANCE_PERCENT,
} from "../balance.js";
import type { ItemKind } from "../events.js";
import type { GoldPile, Item, Position, Trap } from "../state.js";
import { drawSpawnTile, type SpawnChance } from "./spawnPool.js";

/**
 * Chance-rolled items, one independent roll per entry. Same rng-order caveat
 * as floorEnemies.ts's ENEMY_SPAWN_TABLE: the array order is the historical
 * roll order and new kinds go at the end, or every seeded dungeon changes.
 * Guaranteed spawns (healing potions, food, gold, traps) stay outside this
 * table — see drawFloorItems below.
 */
const ITEM_SPAWN_TABLE: readonly SpawnChance<ItemKind>[] = [
	{ kind: "sword", chancePercent: SWORD_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-weapon",
		chancePercent: ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "shield", chancePercent: SHIELD_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-armor",
		chancePercent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "poison", chancePercent: POISON_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "strength", chancePercent: STRENGTH_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "confusion", chancePercent: CONFUSION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "levitation", chancePercent: LEVITATION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "blindness", chancePercent: BLIND_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "paralysis", chancePercent: PARALYSIS_POTION_SPAWN_CHANCE_PERCENT },
	{
		kind: "raise-level",
		chancePercent: RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "detect-monster",
		chancePercent: DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "life", chancePercent: LIFE_POTION_SPAWN_CHANCE_PERCENT },
	{
		kind: "protect-armor",
		chancePercent: PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "teleport-scroll", chancePercent: SCROLL_SPAWN_CHANCE_PERCENT },
	{
		kind: "mapping-scroll",
		chancePercent: MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "identify-scroll",
		chancePercent: IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "regeneration-ring", chancePercent: RING_SPAWN_CHANCE_PERCENT },
	{
		kind: "sustenance-ring",
		chancePercent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "striking-wand", chancePercent: WAND_SPAWN_CHANCE_PERCENT },
	{ kind: "slow-wand", chancePercent: SLOW_WAND_SPAWN_CHANCE_PERCENT },
];

/** Everything drawFloorItems scatters on a floor besides enemies and the staircase. */
export interface FloorItems {
	readonly items: readonly Item[];
	readonly goldPiles: readonly GoldPile[];
	readonly traps: readonly Trap[];
}

/**
 * Every item, gold pile and trap on a fresh floor, drawn from (and removed
 * from) `remaining` by consuming `rng`: POTION_COUNT_PER_FLOOR healing
 * potions and FOOD_COUNT_PER_FLOOR food rations guaranteed, then the
 * chance-rolled kinds of ITEM_SPAWN_TABLE, then GOLD_PILES_PER_FLOOR gold
 * piles (random amount each), TRAP_COUNT_PER_FLOOR dart traps, and the
 * chance-rolled trapdoor (never on GOAL_FLOOR — it would generate a floor
 * beyond it) and teleport trap (allowed on GOAL_FLOOR — it only relocates
 * the player within the floor).
 */
export const drawFloorItems = (
	remaining: Position[],
	rng: Rng,
	floor: number,
): FloorItems => {
	const items: Item[] = [];
	for (let i = 0; i < POTION_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "heal-potion" });
	}
	for (let i = 0; i < FOOD_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "food" });
	}
	for (const spawn of ITEM_SPAWN_TABLE) {
		if (
			remaining.length > 0 &&
			rng.getUniformInt(0, 99) < spawn.chancePercent
		) {
			items.push({ ...drawSpawnTile(remaining, rng), kind: spawn.kind });
		}
	}

	const goldPiles: GoldPile[] = [];
	for (let i = 0; i < GOLD_PILES_PER_FLOOR && remaining.length > 0; i++) {
		goldPiles.push({
			...drawSpawnTile(remaining, rng),
			amount: rng.getUniformInt(GOLD_AMOUNT_MIN, GOLD_AMOUNT_MAX),
		});
	}

	const traps: Trap[] = [];
	for (let i = 0; i < TRAP_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "dart" });
	}
	if (
		floor !== GOAL_FLOOR &&
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TRAPDOOR_SPAWN_CHANCE_PERCENT
	) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "trapdoor" });
	}
	if (
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TELEPORT_TRAP_SPAWN_CHANCE_PERCENT
	) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "teleport" });
	}

	return { items, goldPiles, traps };
};
