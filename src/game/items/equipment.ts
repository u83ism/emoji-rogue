import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
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
import { replaceHeldItem } from "./inventory.js";

type EquippableItem = Extract<HeldItem, { equipped: boolean }>;

export type { EquippableItem };

const isEquippableItem = (item: HeldItem): item is EquippableItem =>
	"equipped" in item;

/**
 * Whether rust (an aquator's hit, a rust trap) has anything to degrade —
 * original Rogue's rust_armor(): an equipped armor that is not leather, not
 * rust-protected, and not already rusted down to RUST_ARMOR_CLASS_LIMIT.
 */
export const canRustEquippedArmor = (
	inventory: readonly HeldItem[],
): boolean => {
	const equippedArmor = findEquippedArmor(inventory);
	return (
		equippedArmor !== undefined &&
		!equippedArmor.rustProtected &&
		equippedArmor.armorKind !== RUSTPROOF_ARMOR_KIND &&
		calculateArmorClass(equippedArmor) < RUST_ARMOR_CLASS_LIMIT
	);
};

/** Worsens the equipped armor by one point (defenseBonus - 1) — a no-op unless canRustEquippedArmor. */
export const applyArmorRust = (
	inventory: readonly HeldItem[],
): readonly HeldItem[] => {
	const equippedArmor = findEquippedArmor(inventory);
	if (equippedArmor === undefined || !canRustEquippedArmor(inventory)) {
		return inventory;
	}
	return replaceHeldItem(inventory, equippedArmor.itemId, {
		...equippedArmor,
		defenseBonus: equippedArmor.defenseBonus - 1,
	});
};

/**
 * Unequips whichever other held item among `otherKinds` (a second weapon; for
 * rings, the other ring kind — regeneration and sustenance share one slot)
 * is currently equipped, if any.
 */
export const unequipOthers = (
	inventory: readonly HeldItem[],
	keepItemId: number,
	otherKinds: readonly EquippableItem["kind"][],
): readonly HeldItem[] => {
	const previouslyEquipped = inventory.find(
		(item): item is EquippableItem =>
			item.itemId !== keepItemId &&
			isEquippableItem(item) &&
			otherKinds.includes(item.kind) &&
			item.equipped,
	);
	if (previouslyEquipped === undefined) {
		return inventory;
	}
	return replaceHeldItem(inventory, previouslyEquipped.itemId, {
		...previouslyEquipped,
		equipped: false,
	});
};

/**
 * Toggles a held weapon's equip state. Equipping unequips any other held
 * weapon first and reveals the curse rolled at pickup (see items/pickups.ts).
 * Unequipping a cursed weapon is refused (logs equip-blocked-cursed, no
 * other state change).
 */
export const applyToggleWeaponEquip = (
	state: GameState,
	item: WeaponItem,
): GameState => {
	if (item.equipped) {
		if (item.cursed) {
			return {
				...state,
				events: buildEventLog(state.events, [
					{ type: "equip-blocked-cursed", payload: { kind: "weapon" } },
				]),
			};
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
	const inventory = replaceHeldItem(
		unequipOthers(state.inventory, item.itemId, ["weapon"]),
		item.itemId,
		{ ...item, equipped: true },
	);
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
			return {
				...state,
				events: buildEventLog(state.events, [
					{ type: "equip-blocked-cursed", payload: { kind: "armor" } },
				]),
			};
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
	const inventory = replaceHeldItem(
		unequipOthers(state.inventory, item.itemId, ["armor"]),
		item.itemId,
		{ ...item, equipped: true },
	);
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
