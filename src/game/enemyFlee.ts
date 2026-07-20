import type { RngState } from "../rng.js";
import { stepUniform } from "../rng.js";
import { THIEF_STEAL_AMOUNT } from "./balance.js";
import type { GameEvent } from "./events.js";
import { removeHeldItemAtIndex } from "./items/inventory.js";
import type { HeldItem } from "./state.js";

/**
 * The outcome of a thief/nymph's adjacent "steal and flee" turn — split out
 * of enemies.ts's advanceEnemies (milestone 90 follow-up) once that file
 * passed the 200-line structure-lint limit.
 */
export interface FleeingTheftResult {
	readonly rng: RngState;
	readonly goldCollected: number;
	readonly inventory: readonly HeldItem[];
	readonly event: GameEvent;
}

/**
 * A thief steals up to THIEF_STEAL_AMOUNT gold; a nymph steals one random
 * *unequipped* held item (equipped items are never stolen — item-stolen
 * fires with kind: undefined if nothing unequipped was held). Neither deals
 * damage; the caller always treats this as a flee (see advanceEnemies).
 */
export const resolveFleeingTheft = (
	kind: "thief" | "nymph",
	rng: RngState,
	goldCollected: number,
	inventory: readonly HeldItem[],
): FleeingTheftResult => {
	if (kind === "thief") {
		const stolen = Math.min(THIEF_STEAL_AMOUNT, goldCollected);
		return {
			rng,
			goldCollected: goldCollected - stolen,
			inventory,
			event: { type: "gold-stolen", payload: { amount: stolen } },
		};
	}
	// Only unequipped items are up for grabs — what's worn stays worn.
	const stealable = inventory
		.map((item, itemIndex) => ({ item, itemIndex }))
		.filter(({ item }) => !("equipped" in item && item.equipped));
	if (stealable.length === 0) {
		return {
			rng,
			goldCollected,
			inventory,
			event: { type: "item-stolen", payload: { kind: undefined } },
		};
	}
	const pick = stepUniform(rng);
	const picked = stealable[Math.floor(pick.value * stealable.length)];
	if (picked === undefined) {
		throw new Error("unreachable: pick is within stealable bounds");
	}
	return {
		rng: pick.state,
		goldCollected,
		inventory: removeHeldItemAtIndex(inventory, picked.itemIndex),
		event: { type: "item-stolen", payload: { kind: picked.item.kind } },
	};
};
