import type { RngState } from "../../../rng.js";
import { stepUniform } from "../../../rng.js";
import {
	calculateGoldAmountMax,
	calculatePlayerMagicSaveChancePercent,
	GOLD_AMOUNT_MIN,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
} from "../../balance.js";
import type { GameEvent } from "../../events.js";
import { toItemEventPayload } from "../../items/equipment/equipmentKinds.js";
import { sumRingBonus } from "../../items/equipment/equipmentStats.js";
import { removeHeldItemAtIndex } from "../../items/inventory/inventory.js";
import type { HeldItem } from "../../state.js";

/**
 * The outcome of a thief/nymph's adjacent "steal and flee" turn — split out
 * of enemies.ts's advanceEnemies (milestone 90 follow-up) once that file
 * passed the 200-line structure-lint limit.
 */
export interface FleeingTheftResult {
	readonly rng: RngState;
	readonly goldCollected: number;
	readonly inventory: readonly HeldItem[];
	/** undefined when a nymph found nothing magic to take — she then stays and keeps attacking. */
	readonly event: GameEvent | undefined;
}

/**
 * What a nymph wants (original Rogue's is_magic()): a weapon with a hit or
 * damage bonus, armor off its kind's armor class or rust-protected, and every
 * potion, scroll, wand, ring and the amulet. Plain gear and food are not.
 */
const isMagicItem = (item: HeldItem): boolean => {
	if (item.kind === "weapon") {
		return item.hitBonus !== 0 || item.damageBonus !== 0;
	}
	if (item.kind === "armor") {
		return item.defenseBonus !== 0 || item.rustProtected;
	}
	return item.kind !== "food-ration";
};

/** Takes one item at `itemIndex` — one off a weapon bundle, the whole slot otherwise. */
const removeOneOf = (
	inventory: readonly HeldItem[],
	itemIndex: number,
): readonly HeldItem[] => {
	const item = inventory[itemIndex];
	if (item?.kind === "weapon" && item.quantity > 1) {
		return inventory.map((held, index) =>
			index === itemIndex ? { ...item, quantity: item.quantity - 1 } : held,
		);
	}
	return removeHeldItemAtIndex(inventory, itemIndex);
};

/** One gold pile's worth on `floor` (GOLD_AMOUNT_MIN..calculateGoldAmountMax), off one rng step. */
const rollGoldPileAmount = (
	rng: RngState,
	floor: number,
): { readonly amount: number; readonly rng: RngState } => {
	const step = stepUniform(rng);
	return {
		amount:
			GOLD_AMOUNT_MIN +
			Math.floor(
				step.value * (calculateGoldAmountMax(floor) - GOLD_AMOUNT_MIN + 1),
			),
		rng: step.state,
	};
};

/**
 * A thief (original Rogue's leprechaun) steals one gold pile's worth at
 * this `floor`'s rate (deeper floors cost more) — or
 * THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME piles' worth when the player fails a
 * magic save (calculatePlayerMagicSaveChancePercent, easier at higher
 * playerLevel and with a ring of protection) — capped at what the player carries; with no gold at all it
 * takes nothing and consumes no rng, but still vanishes. A nymph steals one
 * random *unequipped* magic item (isMagicItem; one off a bundle of
 * weapons). With none she takes nothing and stays (event undefined), as in
 * original Rogue's attack(). The caller has already landed the hit
 * (adjacentAction.ts).
 */
export const resolveFleeingTheft = (
	kind: "thief" | "nymph",
	rng: RngState,
	goldCollected: number,
	inventory: readonly HeldItem[],
	playerLevel: number,
	floor: number,
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
			saveRoll.value * 100 <
			calculatePlayerMagicSaveChancePercent(
				playerLevel,
				sumRingBonus(inventory, "protection-ring"),
			);
		const pileCount = savedAgainstMagic ? 1 : THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME;
		let wanted = 0;
		let nextRng = saveRoll.state;
		for (let i = 0; i < pileCount; i++) {
			const pile = rollGoldPileAmount(nextRng, floor);
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
	// Only unequipped magic items are up for grabs — what's worn stays worn.
	const stealable = inventory
		.map((item, itemIndex) => ({ item, itemIndex }))
		.filter(
			({ item }) => !("equipped" in item && item.equipped) && isMagicItem(item),
		);
	if (stealable.length === 0) {
		return { rng, goldCollected, inventory, event: undefined };
	}
	const pick = stepUniform(rng);
	const picked = stealable[Math.floor(pick.value * stealable.length)];
	if (picked === undefined) {
		throw new Error("unreachable: pick is within stealable bounds");
	}
	return {
		rng: pick.state,
		goldCollected,
		inventory: removeOneOf(inventory, picked.itemIndex),
		event: { type: "item-stolen", payload: toItemEventPayload(picked.item) },
	};
};
