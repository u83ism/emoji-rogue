import type { HeldItem } from "./state.js";

/**
 * What a real run starts with, as in original Rogue's init_player(): a +1,+1
 * mace wielded, +1 ring mail worn, one food ration, a +1 short bow and
 * `arrowCount` arrows (STARTING_ARROWS_MIN..MAX, rolled by the caller). The
 * arena fixture starts empty-handed instead — it exists for tests, which
 * build their own inventories.
 */
export const buildStartingInventory = (
	arrowCount: number,
): readonly HeldItem[] => [
	{
		itemId: 1,
		kind: "weapon",
		weaponKind: "mace",
		equipped: true,
		cursed: false,
		hitBonus: 1,
		damageBonus: 1,
		quantity: 1,
	},
	{
		itemId: 2,
		kind: "armor",
		armorKind: "ring-mail",
		equipped: true,
		cursed: false,
		defenseBonus: 1,
		rustProtected: false,
	},
	{ itemId: 3, kind: "food-ration" },
	{
		itemId: 4,
		kind: "weapon",
		weaponKind: "short-bow",
		equipped: false,
		cursed: false,
		hitBonus: 1,
		damageBonus: 0,
		quantity: 1,
	},
	{
		itemId: 5,
		kind: "weapon",
		weaponKind: "arrow",
		equipped: false,
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: arrowCount,
	},
];
