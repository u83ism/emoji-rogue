import type { ItemKind } from "../events.js";
import type { InventoryEntry } from "../state.js";

/** The inventory with one more `kind`: stacked onto an existing entry, or appended as a new one. */
export const addToInventory = (
	inventory: readonly InventoryEntry[],
	kind: ItemKind,
): readonly InventoryEntry[] => {
	const held = inventory.find((entry) => entry.kind === kind);
	if (held === undefined) {
		return [...inventory, { kind, quantity: 1 }];
	}
	return inventory.map((entry) =>
		entry.kind === kind ? { ...entry, quantity: entry.quantity + 1 } : entry,
	);
};

/** The inventory with one `kind` removed, dropping the stack entirely once it hits zero. */
export const removeFromInventory = (
	inventory: readonly InventoryEntry[],
	kind: ItemKind,
): readonly InventoryEntry[] =>
	inventory
		.map((entry) =>
			entry.kind === kind ? { ...entry, quantity: entry.quantity - 1 } : entry,
		)
		.filter((entry) => entry.quantity > 0);

/** Decrements the stack at `index` by one, dropping it entirely once it hits zero — the nymph's rng-picked steal. */
export const removeOneFromInventory = (
	inventory: readonly InventoryEntry[],
	index: number,
): readonly InventoryEntry[] =>
	inventory
		.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, quantity: entry.quantity - 1 } : entry,
		)
		.filter((entry) => entry.quantity > 0);
