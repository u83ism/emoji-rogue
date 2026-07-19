import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../balance.js";
import { buildEventLog, POTION_KINDS } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { applyRandomTeleport } from "../teleport.js";
import { replaceHeldItem } from "./inventory.js";

// Consumption from inventory happens in the dispatcher (items/use.ts),
// never in the handlers here — a handler only applies its effect.

type SwordItem = Extract<HeldItem, { kind: "sword" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;

/**
 * Raises a targeted held sword's own attackBonus — equipped or not (see
 * HeldItem). No-op (same reference, not consumed) with no matching sword
 * held, same convention as an identify scroll with nothing left to identify.
 */
export const applyUseEnchantWeaponScroll = (
	state: GameState,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item): item is SwordItem =>
			item.kind === "sword" && item.itemId === targetItemId,
	);
	if (target === undefined) {
		return state;
	}
	const attackBonus = target.attackBonus + ENCHANT_WEAPON_BONUS;
	return {
		...state,
		inventory: replaceHeldItem(state.inventory, target.itemId, {
			...target,
			attackBonus,
		}),
		events: buildEventLog(state.events, [
			{ type: "weapon-enchanted", payload: { bonus: ENCHANT_WEAPON_BONUS } },
		]),
	};
};

/** Raises a targeted held armor's own defenseBonus — same targeting/no-op rules as applyUseEnchantWeaponScroll. */
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
 * Frees every currently-equipped cursed item at once (sword/armor/ring
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

/** A teleport scroll relocates the player exactly like a teleport trap does. */
export const applyUseTeleportScroll = (state: GameState): GameState =>
	applyRandomTeleport(state);

/** A magic mapping scroll reveals the whole floor as explored. */
export const applyUseMappingScroll = (state: GameState): GameState => ({
	...state,
	explored: state.terrain.map((column) => column.map(() => true)),
	events: buildEventLog(state.events, [{ type: "floor-mapped", payload: {} }]),
});

/**
 * An identify scroll reveals the first potion kind (in POTION_KINDS order)
 * not yet identified this run. With everything already identified it is a
 * no-op — same reference, no turn spent, scroll not consumed, matching how
 * using an unheld item behaves.
 */
export const applyUseIdentifyScroll = (state: GameState): GameState => {
	const target = POTION_KINDS.find(
		(potionKind) => !state.identifiedPotionKinds.includes(potionKind),
	);
	if (target === undefined) {
		return state;
	}
	return {
		...state,
		identifiedPotionKinds: [...state.identifiedPotionKinds, target],
		events: buildEventLog(state.events, [
			{ type: "potion-identified", payload: { kind: target } },
		]),
	};
};
