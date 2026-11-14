import { stepUniform } from "../../rng.js";
import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../balance.js";
import { buildEventLog } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { replaceHeldItem } from "./inventory.js";

// The scroll kinds that target a specific held weapon/armor (or every
// currently-equipped cursed item), split out of scrolls.ts (milestone 94
// follow-up) once that file passed the 200-line structure-lint limit.
// Consumption from inventory happens in the dispatcher (items/use.ts), never
// in the handlers here — a handler only applies its effect.

type WeaponItem = Extract<HeldItem, { kind: "weapon" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;

/**
 * Enchants a targeted held weapon — equipped or not (see HeldItem) — as
 * original Rogue's scroll does: a coin flip (consuming state.rng once)
 * raises either its hitBonus or its damageBonus, and its curse is lifted.
 * No-op (same reference, not consumed) with no matching weapon held, same
 * convention as an identify scroll with nothing left to identify.
 */
export const applyUseEnchantWeaponScroll = (
	state: GameState,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item): item is WeaponItem =>
			item.kind === "weapon" && item.itemId === targetItemId,
	);
	if (target === undefined) {
		return state;
	}
	const coinFlip = stepUniform(state.rng);
	const stat = coinFlip.value < 0.5 ? "hit" : "damage";
	return {
		...state,
		rng: coinFlip.state,
		inventory: replaceHeldItem(state.inventory, target.itemId, {
			...target,
			cursed: false,
			hitBonus: target.hitBonus + (stat === "hit" ? ENCHANT_WEAPON_BONUS : 0),
			damageBonus:
				target.damageBonus + (stat === "damage" ? ENCHANT_WEAPON_BONUS : 0),
		}),
		events: buildEventLog(state.events, [
			{
				type: "weapon-enchanted",
				payload: { stat, bonus: ENCHANT_WEAPON_BONUS },
			},
		]),
	};
};

/** Raises a targeted held armor's own defenseBonus and lifts its curse — same targeting/no-op rules as applyUseEnchantWeaponScroll. */
export const applyUseEnchantArmorScroll = (
	state: GameState,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item): item is ArmorItem =>
			item.kind === "armor" && item.itemId === targetItemId,
	);
	if (target === undefined) {
		return state;
	}
	const defenseBonus = target.defenseBonus + ENCHANT_ARMOR_BONUS;
	return {
		...state,
		inventory: replaceHeldItem(state.inventory, target.itemId, {
			...target,
			cursed: false,
			defenseBonus,
		}),
		events: buildEventLog(state.events, [
			{ type: "armor-enchanted", payload: { bonus: ENCHANT_ARMOR_BONUS } },
		]),
	};
};

/**
 * Sets rustProtected on a targeted held armor for good — aquator rust never
 * degrades that specific armor again. No-op with no matching armor held, or
 * with the target already protected.
 */
export const applyUseProtectArmorScroll = (
	state: GameState,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item): item is ArmorItem =>
			item.kind === "armor" && item.itemId === targetItemId,
	);
	if (target === undefined || target.rustProtected) {
		return state;
	}
	return {
		...state,
		inventory: replaceHeldItem(state.inventory, target.itemId, {
			...target,
			rustProtected: true,
		}),
		events: buildEventLog(state.events, [
			{ type: "armor-protected", payload: {} },
		]),
	};
};

/**
 * Frees every currently-equipped cursed item at once (weapon/armor/ring
 * slots — up to three). Held-but-unequipped items keep whatever hidden
 * curse they rolled at pickup untouched. No-op with nothing to free.
 */
export const applyUseRemoveCurseScroll = (state: GameState): GameState => {
	const cursedEquipped = state.inventory.filter(
		(item): item is Extract<HeldItem, { equipped: boolean }> =>
			"equipped" in item && item.equipped && item.cursed,
	);
	if (cursedEquipped.length === 0) {
		return state;
	}
	const inventory = cursedEquipped.reduce(
		(currentInventory, item) =>
			replaceHeldItem(currentInventory, item.itemId, {
				...item,
				cursed: false,
			}),
		state.inventory,
	);
	return {
		...state,
		inventory,
		events: buildEventLog(state.events, [
			{ type: "items-decursed", payload: { count: cursedEquipped.length } },
		]),
	};
};
