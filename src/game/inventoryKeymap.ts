import { at } from "../indexing.js";
import type { ItemKind } from "./events.js";
import type { Action } from "./state.js";

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
 * The item kind selected by a keypress inside the open inventory row list,
 * or undefined when the key doesn't match any listed row. Selecting a row
 * only picks it — see toItemVerbAction for the use/drop choice that follows.
 */
export const toSelectedItemKind = (
	input: string,
	inventory: readonly ItemKind[],
): ItemKind | undefined => {
	const index = inventory.findIndex(
		(_kind, entryIndex) => toInventoryLetter(entryIndex) === input,
	);
	return index === -1 ? undefined : at(inventory, index);
};

/**
 * The action for a keypress inside the verb prompt shown after a row is
 * selected: `u` uses the held kind, `d` drops one unit of it onto the
 * player's tile. Any other key answers undefined so the shell can treat it
 * as "cancel back to the row list".
 */
export const toItemVerbAction = (
	input: string,
	kind: ItemKind,
): Action | undefined => {
	if (input === "u") {
		return { type: "use-item", payload: { kind } };
	}
	if (input === "d") {
		return { type: "drop-item", payload: { kind } };
	}
	return undefined;
};
