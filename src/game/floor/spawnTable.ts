import {
	AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT,
	ARMOR_SPAWN_CHANCE_PERCENT,
	BLIND_POTION_SPAWN_CHANCE_PERCENT,
	CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	CONFUSION_POTION_SPAWN_CHANCE_PERCENT,
	DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
	HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	LEVITATION_POTION_SPAWN_CHANCE_PERCENT,
	MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	OTHER_POTION_SPAWN_CHANCE_PERCENT,
	OTHER_RING_SPAWN_CHANCE_PERCENT,
	POISON_POTION_SPAWN_CHANCE_PERCENT,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
	RING_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
	SLOW_WAND_SPAWN_CHANCE_PERCENT,
	STEALTH_RING_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_SPAWN_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	TELEPORT_WAND_SPAWN_CHANCE_PERCENT,
	WEAPON_SPAWN_CHANCE_PERCENT,
} from "../balance.js";
import type { ItemKind } from "../events.js";
import type { SpawnChance } from "./spawnPool.js";

/**
 * Chance-rolled items, one independent roll per entry. Same rng-order caveat
 * as floorEnemies.ts's ENEMY_SPAWN_TABLE: the array order is the historical
 * roll order and new kinds go at the end, or every seeded dungeon changes.
 * Guaranteed spawns (healing potions, food, traps) stay outside this
 * table — see drawFloorItems below.
 */
export const ITEM_SPAWN_TABLE: readonly SpawnChance<ItemKind>[] = [
	{ kind: "weapon", chancePercent: WEAPON_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-weapon",
		chancePercent: ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "armor", chancePercent: ARMOR_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-armor",
		chancePercent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "poison", chancePercent: POISON_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "strength", chancePercent: STRENGTH_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "confusion", chancePercent: CONFUSION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "levitation", chancePercent: LEVITATION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "blindness", chancePercent: BLIND_POTION_SPAWN_CHANCE_PERCENT },
	{
		kind: "raise-level",
		chancePercent: RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "detect-monster",
		chancePercent: DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	},
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
	{ kind: "slow-wand", chancePercent: SLOW_WAND_SPAWN_CHANCE_PERCENT },
	/* Added in milestone 81 — appended at the end so it doesn't shift the roll order of every earlier kind. */
	{
		kind: "remove-curse-scroll",
		chancePercent: REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "teleport-wand",
		chancePercent: TELEPORT_WAND_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "stealth-ring", chancePercent: STEALTH_RING_SPAWN_CHANCE_PERCENT },
	{
		kind: "magic-missile-wand",
		chancePercent: MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "confuse-monster-scroll",
		chancePercent: CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "hallucination",
		chancePercent: HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "hold-monster-scroll",
		chancePercent: HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "aggravate-monster-ring",
		chancePercent: AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT,
	},
	/* The rings of milestone 119 — a stopgap per-kind roll until the original's per-category draw. */
	{ kind: "protection-ring", chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT },
	{ kind: "add-strength-ring", chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT },
	{
		kind: "sustain-strength-ring",
		chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "adornment-ring", chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT },
	{ kind: "dexterity-ring", chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT },
	{
		kind: "increase-damage-ring",
		chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "teleportation-ring",
		chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "maintain-armor-ring",
		chancePercent: OTHER_RING_SPAWN_CHANCE_PERCENT,
	},
	/* The potions of milestone 119 — the same stopgap per-kind roll. */
	{
		kind: "restore-strength-potion",
		chancePercent: OTHER_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "extra-healing-potion",
		chancePercent: OTHER_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "haste-self-potion",
		chancePercent: OTHER_POTION_SPAWN_CHANCE_PERCENT,
	},
];
