import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { replaceHeldItem } from "./inventory.js";

type SwordItem = Extract<HeldItem, { kind: "sword" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;
type EquippableItem = Extract<HeldItem, { equipped: boolean }>;

export type { ArmorItem, EquippableItem };

const findEquippedArmor = (
	inventory: readonly HeldItem[],
): ArmorItem | undefined =>
	inventory.find(
		(item): item is ArmorItem => item.kind === "armor" && item.equipped,
	);

const isEquippableItem = (item: HeldItem): item is EquippableItem =>
	"equipped" in item;

/** The player's actual attack total: playerPower plus the equipped sword's own attackBonus, or 0 unarmed. */
export const calculatePlayerAttackDamage = (state: GameState): number => {
	const equippedSword = state.inventory.find(
		(item): item is SwordItem => item.kind === "sword" && item.equipped,
	);
	return state.playerPower + (equippedSword?.attackBonus ?? 0);
};

/** The player's actual defense: the equipped armor's own defenseBonus, or 0 with nothing worn. */
export const calculatePlayerDefense = (
	inventory: readonly HeldItem[],
): number => findEquippedArmor(inventory)?.defenseBonus ?? 0;

/** Whether an aquator's rust attack should even attempt a roll — only meaningful with an equipped, unprotected armor to degrade. */
export const canRustEquippedArmor = (
	inventory: readonly HeldItem[],
): boolean => {
	const equippedArmor = findEquippedArmor(inventory);
	return equippedArmor !== undefined && !equippedArmor.rustProtected;
};

/** Reduces the equipped armor's defenseBonus by 1 (floored at 0) — a no-op if none is equipped. */
export const applyArmorRust = (
	inventory: readonly HeldItem[],
): readonly HeldItem[] => {
	const equippedArmor = findEquippedArmor(inventory);
	if (equippedArmor === undefined) {
		return inventory;
	}
	return replaceHeldItem(inventory, equippedArmor.itemId, {
		...equippedArmor,
		defenseBonus: Math.max(0, equippedArmor.defenseBonus - 1),
	});
};

/**
 * Unequips whichever other held item among `otherKinds` (a second sword; for
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
 * Toggles a held sword's equip state. Equipping unequips any other held
 * sword first and reveals the curse rolled at pickup (see items/pickups.ts).
 * Unequipping a cursed sword is refused (logs equip-blocked-cursed, no
 * other state change).
 */
export const applyToggleSwordEquip = (
	state: GameState,
	item: SwordItem,
): GameState => {
	if (item.equipped) {
		if (item.cursed) {
			return {
				...state,
				events: buildEventLog(state.events, [
					{ type: "equip-blocked-cursed", payload: { kind: "sword" } },
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
				{ type: "item-unequipped", payload: { kind: "sword" } },
			]),
		};
	}
	const inventory = replaceHeldItem(
		unequipOthers(state.inventory, item.itemId, ["sword"]),
		item.itemId,
		{ ...item, equipped: true },
	);
	const events: GameEvent[] = [
		{
			type: "weapon-equipped",
			payload: { kind: "sword", bonus: item.attackBonus },
		},
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: "sword" } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};

/**
 * Toggles a held armor's equip state — same shape as applyToggleSwordEquip,
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
