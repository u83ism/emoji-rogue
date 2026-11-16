import {
	PLAYER_WEAK_THRESHOLD,
	UNARMED_DAMAGE_DICE,
	UNARMORED_ARMOR_CLASS,
	WEAK_ATTACK_PENALTY,
} from "../balance.js";
import type { DamageDice } from "../damage.js";
import type { GameState, HeldItem } from "../state.js";
import { ARMOR_STATS, WEAPON_STATS } from "./equipmentKinds.js";

// What the player's worn items add up to in combat — pure derivations from
// the inventory, split out of equipment.ts (which keeps the equip/unequip
// and rust transitions) once the dice and armor class of milestone 111
// pushed that file past the 200-line structure-lint limit.

export type WeaponItem = Extract<HeldItem, { kind: "weapon" }>;
export type ArmorItem = Extract<HeldItem, { kind: "armor" }>;

export const findEquippedArmor = (
	inventory: readonly HeldItem[],
): ArmorItem | undefined =>
	inventory.find(
		(item): item is ArmorItem => item.kind === "armor" && item.equipped,
	);

export const findEquippedWeapon = (
	inventory: readonly HeldItem[],
): WeaponItem | undefined =>
	inventory.find(
		(item): item is WeaponItem => item.kind === "weapon" && item.equipped,
	);

/** The dice a player hit rolls: the equipped weapon's own kind's, or bare hands. */
export const calculatePlayerDamageDice = (
	inventory: readonly HeldItem[],
): DamageDice => {
	const equippedWeapon = findEquippedWeapon(inventory);
	return equippedWeapon === undefined
		? UNARMED_DAMAGE_DICE
		: WEAPON_STATS[equippedWeapon.weaponKind].damageDice;
};

/**
 * The flat amount every player hit adds on top of its dice: playerPower
 * plus the equipped weapon's own damageBonus (0 unarmed), reduced by
 * WEAK_ATTACK_PENALTY while playerFood <= PLAYER_WEAK_THRESHOLD — original
 * Rogue's Hungry→Weak→Faint progression, see balance.ts. Derived straight
 * from playerFood rather than a separate flag, so the penalty lifts the
 * instant food rises back above the threshold (eating a ration). Can be
 * zero or negative; the roll itself is floored at 0 in combat.ts.
 */
export const calculatePlayerDamageBonus = (state: GameState): number =>
	calculatePlayerStrengthBonus(state) +
	(findEquippedWeapon(state.inventory)?.damageBonus ?? 0);

/** The part of the damage bonus that comes from the player rather than the weapon — playerPower, less WEAK_ATTACK_PENALTY while starving. A thrown weapon adds this to its own bonus (items/throw.ts). */
export const calculatePlayerStrengthBonus = (state: GameState): number =>
	state.playerFood > PLAYER_WEAK_THRESHOLD
		? state.playerPower
		: state.playerPower - WEAK_ATTACK_PENALTY;

/** The to-hit bonus of the equipped weapon — what a found weapon's curse lowers and its enchantment raises. 0 unarmed. */
export const calculatePlayerHitBonus = (
	inventory: readonly HeldItem[],
): number => findEquippedWeapon(inventory)?.hitBonus ?? 0;

/** One armor's own armor class: its kind's, lowered by its defenseBonus (raised by a cursed one's negative bonus or by rust). */
export const calculateArmorClass = (armor: ArmorItem): number =>
	ARMOR_STATS[armor.armorKind].armorClass - armor.defenseBonus;

/** The player's armor class — the equipped armor's, or UNARMORED_ARMOR_CLASS with nothing worn. Lower is harder to hit (see items/hitChance.ts). */
export const calculatePlayerArmorClass = (
	inventory: readonly HeldItem[],
): number => {
	const equippedArmor = findEquippedArmor(inventory);
	return equippedArmor === undefined
		? UNARMORED_ARMOR_CLASS
		: calculateArmorClass(equippedArmor);
};

/** The player's defense as shown to the player: how far the armor class sits below UNARMORED_ARMOR_CLASS (0 with nothing worn, negative for armor cursed past useless). */
export const calculatePlayerDefense = (
	inventory: readonly HeldItem[],
): number => UNARMORED_ARMOR_CLASS - calculatePlayerArmorClass(inventory);
