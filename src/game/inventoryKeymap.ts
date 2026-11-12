import { at } from "../indexing.js";
import type { ItemKind } from "./events.js";
import type { Action, HeldItem } from "./state.js";

/**
 * Selection letters for inventory rows, in assignment order: all of a-z, one
 * per INVENTORY_CAPACITY slot — original Rogue's MAXPACK = 26 pairing. `i`
 * opens the overlay from the map but is an ordinary row letter (the 9th)
 * inside it; only Esc closes the overlay (see shell/inventoryInteraction.ts).
 * It used to close it too, which left the 9th row unreachable (2026-07-18
 * playtest) and was first worked around by skipping the letter.
 */
const INVENTORY_LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** The single letter assigned to the Nth inventory row (a, b, ..., z). */
export const toInventoryLetter = (index: number): string =>
	INVENTORY_LETTERS[index] ?? "?";

/**
 * The held item selected by a keypress inside an open row list (the main
 * inventory list or a target-selection list — same letter scheme, over
 * whichever array is currently shown), or undefined when the key doesn't
 * match any listed row.
 */
export const toSelectedHeldItem = (
	input: string,
	inventory: readonly HeldItem[],
): HeldItem | undefined => {
	const index = inventory.findIndex(
		(_item, entryIndex) => toInventoryLetter(entryIndex) === input,
	);
	return index === -1 ? undefined : at(inventory, index);
};

/**
 * Which held-item kind a targeted scroll (enchant-weapon, enchant-armor,
 * protect-armor) needs to be pointed at, or undefined for every other kind.
 * The shell reads this to decide whether pressing "use" opens a target row
 * list (filtered to this kind) instead of dispatching immediately.
 */
export const resolveTargetKind = (
	kind: ItemKind,
): "sword" | "armor" | undefined => {
	if (kind === "enchant-weapon") {
		return "sword";
	}
	if (kind === "enchant-armor" || kind === "protect-armor") {
		return "armor";
	}
	return undefined;
};

/**
 * The action for a keypress inside the verb prompt shown after a row is
 * selected: `u` uses the held item, `d` drops it. For a kind resolveTargetKind
 * flags, the shell must intercept `u` before calling this (see main.tsx) and
 * open the target row list instead — this function always builds a
 * targetless use-item. Any other key answers undefined so the shell can
 * treat it as "not a recognized verb".
 */
export const toItemVerbAction = (
	input: string,
	item: HeldItem,
): Action | undefined => {
	if (input === "u") {
		return { type: "use-item", payload: { itemId: item.itemId } };
	}
	if (input === "d") {
		return { type: "drop-item", payload: { itemId: item.itemId } };
	}
	return undefined;
};

/** The use-item action for `sourceItem`, pointed at `targetItem` — the target-row-list follow-up to a resolveTargetKind kind. */
export const toTargetedUseAction = (
	sourceItem: HeldItem,
	targetItem: HeldItem,
): Action => ({
	type: "use-item",
	payload: { itemId: sourceItem.itemId, targetItemId: targetItem.itemId },
});
