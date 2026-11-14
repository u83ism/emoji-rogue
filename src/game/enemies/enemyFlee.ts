import type { RngState } from "../../rng.js";
import { stepUniform } from "../../rng.js";
import {
	calculateMagicSaveChancePercent,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
} from "../balance.js";
import type { GameEvent } from "../events.js";
import { toItemEventPayload } from "../items/equipmentKinds.js";
import { removeHeldItemAtIndex } from "../items/inventory.js";
import type { HeldItem } from "../state.js";

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

/** One gold pile's worth (GOLD_AMOUNT_MIN..GOLD_AMOUNT_MAX), off one rng step. */
const rollGoldPileAmount = (
	rng: RngState,
): { readonly amount: number; readonly rng: RngState } => {
	const step = stepUniform(rng);
	return {
		amount:
			GOLD_AMOUNT_MIN +
			Math.floor(step.value * (GOLD_AMOUNT_MAX - GOLD_AMOUNT_MIN + 1)),
		rng: step.state,
	};
};

/**
 * A thief (original Rogue's leprechaun) steals one gold pile's worth — or
 * THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME piles' worth when the player fails a
 * magic save (calculateMagicSaveChancePercent, easier at higher
 * playerLevel) — capped at what the player carries; with no gold at all it
 * takes nothing and consumes no rng. A nymph steals one random
 * *unequipped* held item (equipped items are never stolen — item-stolen
 * fires with kind: undefined if nothing unequipped was held). Neither deals
 * damage; the caller always treats this as a flee (see advanceEnemies).
 */
export const resolveFleeingTheft = (
	kind: "thief" | "nymph",
	rng: RngState,
	goldCollected: number,
	inventory: readonly HeldItem[],
	playerLevel: number,
): FleeingTheftResult => {
	if (kind === "thief") {
		if (goldCollected === 0) {
			return {
				rng,
				goldCollected,
				inventory,
				event: { type: "gold-stolen", payload: { amount: 0 } },
			};
		}
		const saveRoll = stepUniform(rng);
		const savedAgainstMagic =
			saveRoll.value * 100 < calculateMagicSaveChancePercent(playerLevel);
		const pileCount = savedAgainstMagic ? 1 : THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME;
		let wanted = 0;
		let nextRng = saveRoll.state;
		for (let i = 0; i < pileCount; i++) {
			const pile = rollGoldPileAmount(nextRng);
			wanted += pile.amount;
			nextRng = pile.rng;
		}
		const stolen = Math.min(wanted, goldCollected);
		return {
			rng: nextRng,
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
		event: { type: "item-stolen", payload: toItemEventPayload(picked.item) },
	};
};
