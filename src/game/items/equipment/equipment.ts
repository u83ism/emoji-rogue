import { buildEventLog, type GameEvent } from "../../events.js";
import type { GameState, HeldItem } from "../../state.js";
import { replaceHeldItem } from "../inventory/inventory.js";
import {
	type ArmorItem,
	calculateArmorClass,
	type WeaponItem,
} from "./equipmentStats.js";

type EquippableItem = Extract<HeldItem, { equipped: boolean }>;

export type { EquippableItem };

const isEquippableItem = (item: HeldItem): item is EquippableItem =>
	"equipped" in item;

/** The held item of `kind` other than `keepItemId` that is currently equipped, if any. */
const findOtherEquipped = (
	inventory: readonly HeldItem[],
	keepItemId: number,
	kind: "weapon" | "armor",
): EquippableItem | undefined =>
	inventory.find(
		(item): item is EquippableItem =>
			item.itemId !== keepItemId &&
			isEquippableItem(item) &&
			item.kind === kind &&
			item.equipped,
	);

/** A refused take-off (or swap away from) a cursed weapon/armor: only the equip-blocked-cursed event, nothing else changes. */
const applyCurseBlocked = (
	state: GameState,
	kind: "weapon" | "armor",
): GameState => ({
	...state,
	events: buildEventLog(state.events, [
		{ type: "equip-blocked-cursed", payload: { kind } },
	]),
});

/**
 * Toggles a held weapon's equip state. Equipping unequips the wielded
 * weapon first and reveals the curse rolled at pickup (see items/inventory/pickups.ts).
 * Unequipping a cursed weapon — or wielding another one while it is in hand
 * (original Rogue's wield() runs dropcheck() on cur_weapon) — is refused
 * (logs equip-blocked-cursed, no other state change).
 */
export const applyToggleWeaponEquip = (
	state: GameState,
	item: WeaponItem,
): GameState => {
	if (item.equipped) {
		if (item.cursed) {
			return applyCurseBlocked(state, "weapon");
		}
		return {
			...state,
			inventory: replaceHeldItem(state.inventory, item.itemId, {
				...item,
				equipped: false,
			}),
			events: buildEventLog(state.events, [
				{ type: "item-unequipped", payload: { kind: "weapon" } },
			]),
		};
	}
	const wielded = findOtherEquipped(state.inventory, item.itemId, "weapon");
	if (wielded?.cursed === true) {
		return applyCurseBlocked(state, "weapon");
	}
	const unwielded =
		wielded === undefined
			? state.inventory
			: replaceHeldItem(state.inventory, wielded.itemId, {
					...wielded,
					equipped: false,
				});
	const inventory = replaceHeldItem(unwielded, item.itemId, {
		...item,
		equipped: true,
	});
	const events: GameEvent[] = [
		{
			type: "weapon-equipped",
			payload: {
				weaponKind: item.weaponKind,
				hitBonus: item.hitBonus,
				damageBonus: item.damageBonus,
			},
		},
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: "weapon" } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};

/**
 * What a use-item on `itemId` would do as original Rogue's wear(): "put-on"
 * for held armor going on with none worn (which wastes a turn first —
 * advanceTurn.ts runs it), "refused" for armor while some is already worn
 * (armor-already-worn, no turn spent), undefined for anything else.
 */
export const resolveArmorWear = (
	state: GameState,
	itemId: number,
): "put-on" | "refused" | undefined => {
	const item = state.inventory.find((held) => held.itemId === itemId);
	if (item?.kind !== "armor" || item.equipped) {
		return undefined;
	}
	return findOtherEquipped(state.inventory, itemId, "armor") === undefined
		? "put-on"
		: "refused";
};

/**
 * Toggles a held armor's equip state, as original Rogue's wear()/take_off():
 * taking it off is refused while cursed, and putting it on is refused while
 * other armor is worn (armor-already-worn — take that off first). The event
 * carries the armor class the player now has from it.
 */
export const applyToggleArmorEquip = (
	state: GameState,
	item: ArmorItem,
): GameState => {
	if (item.equipped) {
		if (item.cursed) {
			return applyCurseBlocked(state, "armor");
		}
		return {
			...state,
			inventory: replaceHeldItem(state.inventory, item.itemId, {
				...item,
				equipped: false,
			}),
			events: buildEventLog(state.events, [
				{ type: "item-unequipped", payload: { kind: "armor" } },
			]),
		};
	}
	if (findOtherEquipped(state.inventory, item.itemId, "armor") !== undefined) {
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "armor-already-worn", payload: {} },
			]),
		};
	}
	const inventory = replaceHeldItem(state.inventory, item.itemId, {
		...item,
		equipped: true,
	});
	const events: GameEvent[] = [
		{
			type: "armor-equipped",
			payload: {
				armorKind: item.armorKind,
				armorClass: calculateArmorClass(item),
			},
		},
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: "armor" } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};
