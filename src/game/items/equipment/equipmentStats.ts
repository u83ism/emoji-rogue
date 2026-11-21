import { UNARMED_DAMAGE_DICE, UNARMORED_ARMOR_CLASS } from "../../balance.js";
import type { DamageDice } from "../../combat/damage.js";
import { calculateStrengthDamageBonus } from "../../combat/strength.js";
import type { GameState, HeldItem } from "../../state.js";
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
 * The flat amount every player hit adds on top of its dice: the strength
 * bonus plus the equipped weapon's own damageBonus (0 unarmed). Can be zero
 * or negative; the roll itself is floored at 0 in combat.ts.
 */
export const calculatePlayerDamageBonus = (state: GameState): number =>
	calculatePlayerStrengthBonus(state) +
	(findEquippedWeapon(state.inventory)?.damageBonus ?? 0);

/** The part of the damage bonus that comes from the player rather than the weapon — original Rogue's add_dam[] for the current strength. A thrown weapon adds this to its own bonus (throw.ts). */
export const calculatePlayerStrengthBonus = (state: GameState): number =>
	calculateStrengthDamageBonus(state.playerStrength);

/**
 * The worn rings' values of `kind` — read here directly rather than
 * through items/rings/rings.ts, which builds on combat/strength.ts and so cannot
 * be imported from this module.
 */
export const sumRingBonus = (
	inventory: readonly HeldItem[],
	kind: "protection-ring" | "dexterity-ring" | "increase-damage-ring",
): number =>
	inventory.reduce(
		(total, item) =>
			item.kind === kind && item.equipped ? total + item.bonus : total,
		0,
	);

/**
 * The to-hit bonus of a melee swing: the equipped weapon's own — what a
 * found weapon's curse lowers and its enchantment raises — plus worn
 * dexterity rings, which original Rogue's roll_em() only adds to the
 * wielded weapon (so 0 unarmed).
 */
export const calculatePlayerHitBonus = (
	inventory: readonly HeldItem[],
): number => {
	const weapon = findEquippedWeapon(inventory);
	return weapon === undefined
		? 0
		: weapon.hitBonus + sumRingBonus(inventory, "dexterity-ring");
};

/** What worn increase damage rings add to a melee hit — only with a weapon wielded, as roll_em(). */
export const calculateRingMeleeDamageBonus = (
	inventory: readonly HeldItem[],
): number =>
	findEquippedWeapon(inventory) === undefined
		? 0
		: sumRingBonus(inventory, "increase-damage-ring");

/** One armor's own armor class: its kind's, lowered by its defenseBonus (raised by a cursed one's negative bonus or by rust). */
export const calculateArmorClass = (armor: ArmorItem): number =>
	ARMOR_STATS[armor.armorKind].armorClass - armor.defenseBonus;

/** The player's armor class — the equipped armor's, or UNARMORED_ARMOR_CLASS with nothing worn, lowered by worn protection rings. Lower is harder to hit (see combat/hitChance.ts). */
export const calculatePlayerArmorClass = (
	inventory: readonly HeldItem[],
): number => {
	const equippedArmor = findEquippedArmor(inventory);
	const armorClass =
		equippedArmor === undefined
			? UNARMORED_ARMOR_CLASS
			: calculateArmorClass(equippedArmor);
	return armorClass - sumRingBonus(inventory, "protection-ring");
};

/** The player's defense as shown to the player: how far the armor class sits below UNARMORED_ARMOR_CLASS (0 with nothing worn, negative for armor cursed past useless). */
export const calculatePlayerDefense = (
	inventory: readonly HeldItem[],
): number => UNARMORED_ARMOR_CLASS - calculatePlayerArmorClass(inventory);
