import { stepUniform } from "../../../rng.js";
import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../../balance.js";
import { buildEventLog, type ItemKind } from "../../events.js";
import type { GameState, HeldItem } from "../../state.js";
import { replaceHeldItem } from "../inventory.js";

// The scroll kinds that work on the worn weapon/armor (or every worn cursed
// item), split out of scrolls.ts (milestone 94 follow-up) once that file
// passed the 200-line structure-lint limit. As in original Rogue's
// read_scroll(), they act on what is equipped, never on a chosen item, and
// a scroll is used up even when it finds nothing to work on. Consumption
// from inventory happens in the dispatcher (items/use.ts), never in the
// handlers here — a handler only applies its effect.

type WeaponItem = Extract<HeldItem, { kind: "weapon" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;

const findEquippedWeapon = (state: GameState): WeaponItem | undefined =>
	state.inventory.find(
		(item): item is WeaponItem => item.kind === "weapon" && item.equipped,
	);

const findEquippedArmor = (state: GameState): ArmorItem | undefined =>
	state.inventory.find(
		(item): item is ArmorItem => item.kind === "armor" && item.equipped,
	);

/** A read scroll that found nothing to work on — still used up (original Rogue's "you feel a strange sense of loss"). */
export const applyScrollWasted = (
	state: GameState,
	kind: ItemKind,
): GameState => ({
	...state,
	events: buildEventLog(state.events, [
		{ type: "scroll-wasted", payload: { kind } },
	]),
});

/**
 * Enchants the wielded weapon, as original Rogue's scroll does: a coin flip
 * (consuming state.rng once) raises either its hitBonus or its damageBonus,
 * and its curse is lifted. With no weapon wielded the scroll is wasted.
 */
export const applyUseEnchantWeaponScroll = (state: GameState): GameState => {
	const target = findEquippedWeapon(state);
	if (target === undefined) {
		return applyScrollWasted(state, "enchant-weapon");
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

/** Raises the worn armor's own defenseBonus and lifts its curse — wasted with no armor worn. */
export const applyUseEnchantArmorScroll = (state: GameState): GameState => {
	const target = findEquippedArmor(state);
	if (target === undefined) {
		return applyScrollWasted(state, "enchant-armor");
	}
	return {
		...state,
		inventory: replaceHeldItem(state.inventory, target.itemId, {
			...target,
			cursed: false,
			defenseBonus: target.defenseBonus + ENCHANT_ARMOR_BONUS,
		}),
		events: buildEventLog(state.events, [
			{ type: "armor-enchanted", payload: { bonus: ENCHANT_ARMOR_BONUS } },
		]),
	};
};

/**
 * Sets rustProtected on the worn armor for good — aquator rust never
 * degrades that armor again. Wasted with no armor worn; on armor already
 * protected it shimmers again all the same, as in the original.
 */
export const applyUseProtectArmorScroll = (state: GameState): GameState => {
	const target = findEquippedArmor(state);
	if (target === undefined) {
		return applyScrollWasted(state, "protect-armor");
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
 * slots). Held-but-unequipped items keep whatever hidden curse they rolled
 * at pickup untouched. With nothing worn cursed the scroll is wasted.
 */
export const applyUseRemoveCurseScroll = (state: GameState): GameState => {
	const cursedEquipped = state.inventory.filter(
		(item): item is Extract<HeldItem, { equipped: boolean }> =>
			"equipped" in item && item.equipped && item.cursed,
	);
	if (cursedEquipped.length === 0) {
		return applyScrollWasted(state, "remove-curse-scroll");
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
