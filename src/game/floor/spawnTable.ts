import type { ItemKind } from "../events.js";

/**
 * Original Rogue's item tables (extern.c), as new_thing() draws from them:
 * first the category by ITEM_CATEGORY_WEIGHTS (things[]), then the kind
 * within it by its own weight (pot_info[], scr_info[], ring_info[],
 * ws_info[]). The original's kinds not in this game yet are left out, so a
 * category draws among the ones that exist — each still as likely,
 * relative to the others, as in the original. **Entry order is rng
 * order**: reordering changes every seeded dungeon.
 */
export const ITEM_CATEGORY_WEIGHTS = [
	{ category: "potion", weight: 26 },
	{ category: "scroll", weight: 36 },
	{ category: "food", weight: 16 },
	{ category: "weapon", weight: 7 },
	{ category: "armor", weight: 7 },
	{ category: "ring", weight: 4 },
	{ category: "wand", weight: 4 },
] as const;

export type ItemCategory = (typeof ITEM_CATEGORY_WEIGHTS)[number]["category"];

/** A kind and its weight within its category. */
export interface KindWeight {
	readonly kind: ItemKind;
	readonly weight: number;
}

export const ITEM_KIND_WEIGHTS: Readonly<
	Record<ItemCategory, readonly KindWeight[]>
> = {
	potion: [
		{ kind: "confusion", weight: 7 },
		{ kind: "hallucination", weight: 8 },
		{ kind: "poison", weight: 8 },
		{ kind: "strength", weight: 13 },
		{ kind: "see-invisible-potion", weight: 3 },
		{ kind: "heal-potion", weight: 13 },
		{ kind: "detect-monster", weight: 6 },
		{ kind: "raise-level", weight: 2 },
		{ kind: "extra-healing-potion", weight: 5 },
		{ kind: "haste-self-potion", weight: 5 },
		{ kind: "restore-strength-potion", weight: 13 },
		{ kind: "blindness", weight: 5 },
		{ kind: "levitation", weight: 6 },
	],
	scroll: [
		{ kind: "confuse-monster-scroll", weight: 7 },
		{ kind: "mapping-scroll", weight: 4 },
		{ kind: "hold-monster-scroll", weight: 2 },
		{ kind: "sleep-scroll", weight: 3 },
		{ kind: "enchant-armor", weight: 7 },
		/* the original's identify potion scroll — see items/scrolls/scrolls.ts */
		{ kind: "identify-scroll", weight: 10 },
		{ kind: "teleport-scroll", weight: 5 },
		{ kind: "enchant-weapon", weight: 8 },
		{ kind: "create-monster-scroll", weight: 4 },
		{ kind: "remove-curse-scroll", weight: 7 },
		{ kind: "aggravate-monsters-scroll", weight: 3 },
		{ kind: "protect-armor", weight: 2 },
	],
	/* the original's slime mold (1 in 10) is not in this game: every food is a ration */
	food: [{ kind: "food", weight: 1 }],
	weapon: [{ kind: "weapon", weight: 1 }],
	armor: [{ kind: "armor", weight: 1 }],
	ring: [
		{ kind: "protection-ring", weight: 9 },
		{ kind: "add-strength-ring", weight: 9 },
		{ kind: "sustain-strength-ring", weight: 5 },
		{ kind: "searching-ring", weight: 10 },
		{ kind: "see-invisible-ring", weight: 10 },
		{ kind: "adornment-ring", weight: 1 },
		{ kind: "aggravate-monster-ring", weight: 10 },
		{ kind: "dexterity-ring", weight: 8 },
		{ kind: "increase-damage-ring", weight: 8 },
		{ kind: "regeneration-ring", weight: 4 },
		{ kind: "sustenance-ring", weight: 9 },
		{ kind: "teleportation-ring", weight: 5 },
		{ kind: "stealth-ring", weight: 7 },
		{ kind: "maintain-armor-ring", weight: 5 },
	],
	wand: [
		{ kind: "light-wand", weight: 12 },
		{ kind: "nothing-wand", weight: 1 },
		{ kind: "teleport-to-wand", weight: 6 },
		{ kind: "haste-monster-wand", weight: 10 },
		{ kind: "magic-missile-wand", weight: 10 },
		{ kind: "slow-wand", weight: 11 },
		{ kind: "teleport-wand", weight: 6 },
	],
};

const sumWeights = (entries: readonly { readonly weight: number }[]): number =>
	entries.reduce((total, entry) => total + entry.weight, 0);

/**
 * The share (in percent, of one item draw) that comes out as \`kind\` — what
 * the catalog prints. 0 for a kind in no table.
 */
export const calculateItemDrawSharePercent = (kind: ItemKind): number => {
	for (const { category, weight } of ITEM_CATEGORY_WEIGHTS) {
		const kinds = ITEM_KIND_WEIGHTS[category];
		const entry = kinds.find((candidate) => candidate.kind === kind);
		if (entry !== undefined) {
			return (
				(100 * weight * entry.weight) /
				(sumWeights(ITEM_CATEGORY_WEIGHTS) * sumWeights(kinds))
			);
		}
	}
	return 0;
};

/** One entry out of \`entries\`, each as likely as its weight. Consumes \`roll\` (0 ≤ roll < the total weight). */
export const pickByWeight = <Entry extends { readonly weight: number }>(
	entries: readonly Entry[],
	roll: number,
): Entry => {
	let remaining = roll;
	for (const entry of entries) {
		remaining -= entry.weight;
		if (remaining < 0) {
			return entry;
		}
	}
	throw new Error("unreachable: the roll is below the total weight");
};

export const ITEM_CATEGORY_TOTAL_WEIGHT = sumWeights(ITEM_CATEGORY_WEIGHTS);

/** The total weight of a category's kinds — the bound for its pickByWeight roll. */
export const calculateCategoryTotalWeight = (category: ItemCategory): number =>
	sumWeights(ITEM_KIND_WEIGHTS[category]);
