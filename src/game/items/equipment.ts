import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import {
	type ArmorItem,
	findEquippedArmor,
	type WeaponItem,
} from "./equipmentStats.js";
import { replaceHeldItem } from "./inventory.js";

type EquippableItem = Extract<HeldItem, { equipped: boolean }>;

export type { EquippableItem };

const isEquippableItem = (item: HeldItem): item is EquippableItem =>
	"equipped" in item;

/** Whether an aquator's rust attack should even attempt a roll — only meaningful with an equipped, unprotected armor to degrade. */
export const canRustEquippedArmor = (
	inventory: readonly HeldItem[],
): boolean => {
	const equippedArmor = findEquippedArmor(inventory);
	return equippedArmor !== undefined && !equippedArmor.rustProtected;
};

/** Reduces the equipped armor's defenseBonus by 1, never below 0 — a no-op if none is equipped or it is already at/below 0 (rust never raises a cursed armor's negative bonus to 0). */
export const applyArmorRust = (
	inventory: readonly HeldItem[],
): readonly HeldItem[] => {
	const equippedArmor = findEquippedArmor(inventory);
	if (equippedArmor === undefined) {
		return inventory;
	}
	return replaceHeldItem(inventory, equippedArmor.itemId, {
		...equippedArmor,
		defenseBonus:
			equippedArmor.defenseBonus <= 0
				? equippedArmor.defenseBonus
				: equippedArmor.defenseBonus - 1,
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
			payload: { kind: "weapon", bonus: item.attackBonus },
		},
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: "weapon" } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};

/**
 * Toggles a held armor's equip state — same shape as applyToggleWeaponEquip,
 * for the defenseBonus/rustProtected fields instead.
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
			payload: { kind: "armor", bonus: item.defenseBonus },
		},
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: "armor" } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};
