import { at } from "../indexing.js";
import { type ItemKind, isWandKind } from "./events.js";
import {
	IDENTIFY_SCROLL_TARGETS,
	isIdentifyScrollKind,
} from "./items/scrolls/identifyScrolls.js";
import type { Action, Direction, HeldItem } from "./state.js";

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
 * The held items a targeted scroll can be pointed at, or undefined for a
 * kind that takes no target. Only the identify scroll does (original
 * Rogue's identify potion scroll: the player picks one potion). The shell
 * reads this to decide whether pressing "use" opens a target row list
 * instead of dispatching immediately — with no candidate at all it
 * dispatches the targetless use, which wastes the scroll as in the original.
 */
export const filterScrollTargets = (
	kind: ItemKind,
	inventory: readonly HeldItem[],
): readonly HeldItem[] | undefined =>
	isIdentifyScrollKind(kind)
		? inventory.filter((item) => IDENTIFY_SCROLL_TARGETS[kind](item.kind))
		: undefined;

/** Whether the verb prompt offers "throw" for `item`: any weapon except the one currently wielded (original Rogue refuses to throw that one too). */
export const canThrowItem = (item: HeldItem): boolean =>
	item.kind === "weapon" && !item.equipped;

/**
 * The action for a keypress inside the verb prompt shown after a row is
 * selected: `u` uses the held item, `d` drops it. `t` (throw, weapons
 * only — see canThrowItem) asks for a direction first, so the shell
 * handles it (toDirectedAction). For a kind filterScrollTargets
 * gives candidates for, the shell must intercept `u` before calling this (see main.tsx) and
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

/** Whether using `item` (`u`) first asks which way — a wand, as original Rogue's do_zap(). */
export const asksZapDirection = (item: HeldItem): boolean =>
	isWandKind(item.kind);

/** The action for `item` toward `direction` — the direction-prompt follow-up: a wand's zap (`u`), any other item's throw (`t`). */
export const toDirectedAction = (
	item: HeldItem,
	direction: Direction,
): Action =>
	asksZapDirection(item)
		? { type: "use-item", payload: { itemId: item.itemId, direction } }
		: { type: "throw-item", payload: { itemId: item.itemId, direction } };

/** The use-item action for `sourceItem`, pointed at `targetItem` — the target-row-list follow-up to a filterScrollTargets kind. */
export const toTargetedUseAction = (
	sourceItem: HeldItem,
	targetItem: HeldItem,
): Action => ({
	type: "use-item",
	payload: { itemId: sourceItem.itemId, targetItemId: targetItem.itemId },
});
