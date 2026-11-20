import type { Rng } from "../../rng.js";
import {
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
} from "../balance.js";
import { isValuedRingKind, type RingKind } from "../events.js";
import type { Item, Position } from "../state.js";

// The random rolls behind a found item's identity — which weighted kind,
// how cursed or enchanted, a ring's value — split out of heldItemFactory.ts
// once the rings of milestone 119 pushed that file past the 200-line
// structure-lint limit. heldItemFactory.ts puts them together into floor Items.

/** One kind out of `kinds`, each as likely as its spawnWeight — original Rogue's pick_one() over a weighted table. Consumes `rng` once. */
export const drawWeightedKind = <Kind extends string>(
	rng: Rng,
	kinds: readonly Kind[],
	stats: Readonly<Record<Kind, { readonly spawnWeight: number }>>,
): Kind => {
	const totalWeight = kinds.reduce(
		(sum, kind) => sum + stats[kind].spawnWeight,
		0,
	);
	let remaining = rng.getUniformInt(0, totalWeight - 1);
	for (const kind of kinds) {
		remaining -= stats[kind].spawnWeight;
		if (remaining < 0) {
			return kind;
		}
	}
	throw new Error("unreachable: the roll is below the total weight");
};

/**
 * Original Rogue's found-weapon/armor roll (see balance.ts's
 * WEAPON_CURSE_CHANCE_PERCENT): one percent roll picks cursed / found
 * enchanted / ordinary, and only the first two roll a second time for how
 * many points the bonus moves (down for a curse, up for an enchantment).
 */
export const rollFoundBonus = (
	rng: Rng,
	curseChancePercent: number,
	enchantedChancePercent: number,
): { readonly cursed: boolean; readonly bonus: number } => {
	const roll = rng.getUniformInt(0, 99);
	if (roll >= curseChancePercent + enchantedChancePercent) {
		return { cursed: false, bonus: 0 };
	}
	const adjustment = rng.getUniformInt(
		FOUND_BONUS_ADJUSTMENT_MIN,
		FOUND_BONUS_ADJUSTMENT_MAX,
	);
	return roll < curseChancePercent
		? { cursed: true, bonus: -adjustment }
		: { cursed: false, bonus: adjustment };
};

/**
 * A ring's identity, as original Rogue's new_thing(): a ring with a value
 * rolls 0..2 — 0 makes it -1 and cursed, otherwise that is its value — the
 * rings of aggravate monster and teleportation are always cursed, and no
 * other ring ever is. Only a valued ring consumes `rng`.
 */
export const buildFloorRing = (
	kind: RingKind,
	itemId: number,
	position: Position,
	rng: Rng,
): Item => {
	if (isValuedRingKind(kind)) {
		const roll = rng.getUniformInt(0, 2);
		return {
			...position,
			kind,
			identity: { itemId, cursed: roll === 0, bonus: roll === 0 ? -1 : roll },
		};
	}
	return {
		...position,
		kind,
		identity: {
			itemId,
			cursed:
				kind === "aggravate-monster-ring" || kind === "teleportation-ring",
		},
	};
};
