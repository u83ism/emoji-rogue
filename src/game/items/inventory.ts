import type { ItemKind } from "../events.js";

/** The inventory with `kind` appended as a new slot — every pickup, even of an already-held kind, takes its own slot (no stacking). */
export const addToInventory = (
	inventory: readonly ItemKind[],
	kind: ItemKind,
): readonly ItemKind[] => [...inventory, kind];

/** The inventory with the first slot holding `kind` removed, or unchanged if `kind` is not held. */
export const removeFromInventory = (
	inventory: readonly ItemKind[],
	kind: ItemKind,
): readonly ItemKind[] => {
	const index = inventory.indexOf(kind);
	return index === -1 ? inventory : removeOneFromInventory(inventory, index);
};

/** The inventory with the slot at `index` removed — the nymph's rng-picked steal. */
export const removeOneFromInventory = (
	inventory: readonly ItemKind[],
	index: number,
): readonly ItemKind[] => [
	...inventory.slice(0, index),
	...inventory.slice(index + 1),
];
