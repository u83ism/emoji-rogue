import { at } from "../indexing.js";
import type { Action, InventoryEntry } from "./state.js";

const FIRST_LETTER_CODE = "a".charCodeAt(0);

/** The single letter assigned to the Nth inventory row (a, b, c, ...). */
export const toInventoryLetter = (index: number): string =>
	String.fromCharCode(FIRST_LETTER_CODE + index);

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
