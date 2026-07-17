import { at } from "../indexing.js";
import type { Action, InventoryEntry } from "./state.js";

/**
 * Selection letters for inventory rows, in assignment order. `i` is
 * deliberately absent: inside the open overlay `i` closes it (see main.tsx),
 * so a row lettered `i` could never be selected (2026-07-18 playtest —
 * the 9th item was unreachable).
 */
const INVENTORY_LETTERS = "abcdefghjklmnopqrstuvwxyz";

/** The single letter assigned to the Nth inventory row (a, b, ..., h, j, ...). */
export const toInventoryLetter = (index: number): string =>
	INVENTORY_LETTERS[index] ?? "?";

/**
 * The `use-item` action for a keypress inside the open inventory overlay, or
 * undefined when the key doesn't match any listed row.
 */
export const toUseItemAction = (
	input: string,
	inventory: readonly InventoryEntry[],
): Action | undefined => {
	const index = inventory.findIndex(
		(_entry, entryIndex) => toInventoryLetter(entryIndex) === input,
	);
	if (index === -1) {
		return undefined;
	}
	return { type: "use-item", payload: { kind: at(inventory, index).kind } };
};
