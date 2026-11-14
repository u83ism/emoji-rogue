import {
	PLAYER_WEAK_THRESHOLD,
	SWORD_DAMAGE_DICE,
	UNARMED_DAMAGE_DICE,
	UNARMORED_ARMOR_CLASS,
	WEAK_ATTACK_PENALTY,
} from "../balance.js";
import type { DamageDice } from "../damage.js";
import type { GameState, HeldItem } from "../state.js";

// What the player's worn items add up to in combat — pure derivations from
// the inventory, split out of equipment.ts (which keeps the equip/unequip
// and rust transitions) once the dice and armor class of milestone 111
// pushed that file past the 200-line structure-lint limit.

export type SwordItem = Extract<HeldItem, { kind: "sword" }>;
export type ArmorItem = Extract<HeldItem, { kind: "armor" }>;

export const findEquippedArmor = (
	inventory: readonly HeldItem[],
): ArmorItem | undefined =>
	inventory.find(
		(item): item is ArmorItem => item.kind === "armor" && item.equipped,
	);

const findEquippedSword = (
	inventory: readonly HeldItem[],
): SwordItem | undefined =>
	inventory.find(
		(item): item is SwordItem => item.kind === "sword" && item.equipped,
	);

/** The dice a player hit rolls: the equipped sword's, or bare hands. */
export const calculatePlayerDamageDice = (
	inventory: readonly HeldItem[],
): DamageDice =>
	findEquippedSword(inventory) === undefined
		? UNARMED_DAMAGE_DICE
		: SWORD_DAMAGE_DICE;

/**
 * The flat amount every player hit adds on top of its dice: playerPower
 * plus the equipped sword's own attackBonus (0 unarmed), reduced by
 * WEAK_ATTACK_PENALTY while playerFood <= PLAYER_WEAK_THRESHOLD — original
 * Rogue's Hungry→Weak→Faint progression, see balance.ts. Derived straight
 * from playerFood rather than a separate flag, so the penalty lifts the
 * instant food rises back above the threshold (eating a ration). Can be
 * zero or negative (a cursed sword); the roll itself is floored at 0 in
 * combat.ts.
 */
export const calculatePlayerAttackDamage = (state: GameState): number => {
	const baseDamage =
		state.playerPower + (findEquippedSword(state.inventory)?.attackBonus ?? 0);
	return state.playerFood > PLAYER_WEAK_THRESHOLD
		? baseDamage
		: baseDamage - WEAK_ATTACK_PENALTY;
};

/** The player's actual defense: the equipped armor's own defenseBonus (negative for a cursed armor — worse than wearing nothing), or 0 with nothing worn. */
export const calculatePlayerDefense = (
	inventory: readonly HeldItem[],
): number => findEquippedArmor(inventory)?.defenseBonus ?? 0;

/** The player's armor class — UNARMORED_ARMOR_CLASS lowered by every point of defense. Lower is harder to hit (see items/hitChance.ts). */
export const calculatePlayerArmorClass = (
	inventory: readonly HeldItem[],
): number => UNARMORED_ARMOR_CLASS - calculatePlayerDefense(inventory);
