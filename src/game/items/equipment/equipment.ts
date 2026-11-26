import { buildEventLog, type GameEvent } from "../../events.js";
import type { GameState, HeldItem } from "../../state.js";
import { replaceHeldItem } from "../inventory/inventory.js";
import {
	RUST_ARMOR_CLASS_LIMIT,
	RUSTPROOF_ARMOR_KIND,
} from "./equipmentKinds.js";
import {
	type ArmorItem,
	calculateArmorClass,
	findEquippedArmor,
	type WeaponItem,
} from "./equipmentStats.js";

type EquippableItem = Extract<HeldItem, { equipped: boolean }>;

export type { EquippableItem };

const isEquippableItem = (item: HeldItem): item is EquippableItem =>
	"equipped" in item;

/** What one rust attempt did: the (possibly worsened) inventory and the event to log, if any. */
export interface ArmorRust {
	readonly inventory: readonly HeldItem[];
	readonly event: GameEvent | undefined;
}

/**
 * One rust attempt (an aquator's landed hit, a rust trap), as original
 * Rogue's rust_armor(): no armor, leather, or armor already rusted down to
 * RUST_ARMOR_CLASS_LIMIT is silently unaffected; protected armor or a worn
 * ring of maintain armor blocks the rust and logs armor-rust-blocked ("the rust vanishes instantly");
 * otherwise the armor loses a point (defenseBonus - 1) and armor-rusted is
 * logged.
 */
export const resolveArmorRust = (inventory: readonly HeldItem[]): ArmorRust => {
	const equippedArmor = findEquippedArmor(inventory);
	if (
		equippedArmor === undefined ||
		equippedArmor.armorKind === RUSTPROOF_ARMOR_KIND ||
		calculateArmorClass(equippedArmor) >= RUST_ARMOR_CLASS_LIMIT
	) {
		return { inventory, event: undefined };
	}
	if (
		equippedArmor.rustProtected ||
		inventory.some(
			(item) => item.kind === "maintain-armor-ring" && item.equipped,
		)
	) {
		return { inventory, event: { type: "armor-rust-blocked", payload: {} } };
	}
	return {
		inventory: replaceHeldItem(inventory, equippedArmor.itemId, {
			...equippedArmor,
			defenseBonus: equippedArmor.defenseBonus - 1,
		}),
		event: { type: "armor-rusted", payload: { amount: 1 } },
	};
};

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
 * Toggles a held armor's equip state — same shape as applyToggleWeaponEquip.
 * The event carries the armor class the player now has from it.
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
	const worn = findOtherEquipped(state.inventory, item.itemId, "armor");
	if (worn?.cursed === true) {
		return applyCurseBlocked(state, "armor");
	}
	const unworn =
		worn === undefined
			? state.inventory
			: replaceHeldItem(state.inventory, worn.itemId, {
					...worn,
					equipped: false,
				});
	const inventory = replaceHeldItem(unworn, item.itemId, {
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
