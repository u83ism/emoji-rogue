import type { HeldItem } from "../state.js";

/** The inventory with a freshly built HeldItem appended — see applyItemPickup, which builds it. */
export const addToInventory = (
	inventory: readonly HeldItem[],
	item: HeldItem,
): readonly HeldItem[] => [...inventory, item];

/** The inventory with the held item matching `itemId` removed, or unchanged if not held. */
export const removeHeldItem = (
	inventory: readonly HeldItem[],
	itemId: number,
): readonly HeldItem[] => inventory.filter((item) => item.itemId !== itemId);

/**
 * The inventory with the held item matching `itemId` replaced by `nextItem`
 * — used to toggle equip state or bump an enchantment value in place, never
 * to change which item an id refers to.
 */
export const replaceHeldItem = (
	inventory: readonly HeldItem[],
	itemId: number,
	nextItem: HeldItem,
): readonly HeldItem[] =>
	inventory.map((item) => (item.itemId === itemId ? nextItem : item));

/** The held item at `index`, or undefined out of range — the nymph's rng-picked steal. */
export const removeHeldItemAtIndex = (
	inventory: readonly HeldItem[],
	index: number,
): readonly HeldItem[] => [
	...inventory.slice(0, index),
	...inventory.slice(index + 1),
];
