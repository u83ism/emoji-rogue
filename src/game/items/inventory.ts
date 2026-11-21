import type { HeldItem } from "../state.js";
import { isStackableWeaponKind } from "./equipment/equipmentKinds.js";

/**
 * The held stack a picked-up `item` joins instead of taking a slot of its
 * own: a weapon of the same bundled kind with the same bonuses, neither of
 * them cursed (a curse is hidden until wielded, so a cursed batch must not
 * silently blend into a clean one). Undefined for everything else.
 */
export const findStackTarget = (
	inventory: readonly HeldItem[],
	item: HeldItem,
): Extract<HeldItem, { kind: "weapon" }> | undefined => {
	if (
		item.kind !== "weapon" ||
		item.cursed ||
		!isStackableWeaponKind(item.weaponKind)
	) {
		return undefined;
	}
	return inventory.find(
		(held): held is Extract<HeldItem, { kind: "weapon" }> =>
			held.kind === "weapon" &&
			held.weaponKind === item.weaponKind &&
			!held.cursed &&
			held.hitBonus === item.hitBonus &&
			held.damageBonus === item.damageBonus,
	);
};

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
