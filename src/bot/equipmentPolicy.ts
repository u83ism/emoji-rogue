import { type ItemKind, isRingKind, type RingKind } from "../game/events.js";
import { WEAPON_STATS } from "../game/items/equipmentKinds.js";
import { calculateArmorClass } from "../game/items/equipmentStats.js";
import type { GameState, HeldItem } from "../game/state.js";

type WeaponItem = Extract<HeldItem, { kind: "weapon" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;
type RingItem = Extract<HeldItem, { kind: RingKind }>;

const isWeaponItem = (item: HeldItem): item is WeaponItem =>
	item.kind === "weapon";
const isArmorItem = (item: HeldItem): item is ArmorItem =>
	item.kind === "armor";
const isRingItem = (item: HeldItem): item is RingItem => isRingKind(item.kind);

/**
 * Best-first ring preference: sustenance first (the food economy is the
 * dominant killer — see docs/tasks/game-notes.md's balance notes), then
 * regeneration (passive combat sustain), then the rings that help a fight,
 * then the stealth utility ring. Aggravate monster and teleportation are
 * deliberately absent (always cursed, and harmful), as is adornment (does
 * nothing).
 */
const RING_PREFERENCE_ORDER: readonly ItemKind[] = [
	"sustenance-ring",
	"regeneration-ring",
	"protection-ring",
	"maintain-armor-ring",
	"sustain-strength-ring",
	"add-strength-ring",
	"increase-damage-ring",
	"dexterity-ring",
	"stealth-ring",
];

/** A weapon's average damage per hit (dice mean + its own damageBonus) plus its hitBonus — a rough single score, good enough to rank a long sword over a dagger. */
const scoreWeapon = (weapon: WeaponItem): number => {
	const dice = WEAPON_STATS[weapon.weaponKind].damageDice;
	return (
		(dice.count * (dice.sides + 1)) / 2 + weapon.damageBonus + weapon.hitBonus
	);
};

/** Higher is better: the negated armor class the armor gives. */
const scoreArmor = (armor: ArmorItem): number => -calculateArmorClass(armor);

/**
 * The itemId of a weapon worth equipping this turn, if any: the best-scoring
 * held-but-unequipped weapon, only when it beats (or nothing beats) whatever
 * weapon is currently equipped — weapons/armor/rings toggle equip state rather
 * than being consumed (see items/equipment.ts), so blindly re-using an
 * already-equipped one would unequip it instead of helping.
 */
export const decideWeaponToEquip = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
): number | undefined => {
	if (disabledKinds.has("weapon")) {
		return undefined;
	}
	const weapons = state.inventory.filter(isWeaponItem);
	const equipped = weapons.find((weapon) => weapon.equipped);
	const bestUnequipped = weapons
		.filter((weapon) => !weapon.equipped)
		.sort((left, right) => scoreWeapon(right) - scoreWeapon(left))
		.at(0);
	if (bestUnequipped === undefined) {
		return undefined;
	}
	if (
		equipped !== undefined &&
		scoreWeapon(equipped) >= scoreWeapon(bestUnequipped)
	) {
		return undefined;
	}
	return bestUnequipped.itemId;
};

/** Same idea as decideWeaponToEquip, ranking by the armor class each armor gives. */
export const decideArmorToEquip = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
): number | undefined => {
	if (disabledKinds.has("armor")) {
		return undefined;
	}
	const armors = state.inventory.filter(isArmorItem);
	const equipped = armors.find((armor) => armor.equipped);
	const bestUnequipped = armors
		.filter((armor) => !armor.equipped)
		.sort((left, right) => scoreArmor(right) - scoreArmor(left))
		.at(0);
	if (bestUnequipped === undefined) {
		return undefined;
	}
	if (
		equipped !== undefined &&
		scoreArmor(equipped) >= scoreArmor(bestUnequipped)
	) {
		return undefined;
	}
	return bestUnequipped.itemId;
};

/**
 * The itemId of a ring worth putting on this turn, if any: while a hand is
 * free, the best-ranked held-but-unworn ring by RING_PREFERENCE_ORDER —
 * never one already cursed with a negative value, and never a second of a
 * kind already worn. The bot reads the real kind and curse off the state,
 * so it never risks an unknown ring.
 */
export const decideRingToEquip = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
): number | undefined => {
	const rings = state.inventory.filter(isRingItem);
	const worn = rings.filter((ring) => ring.equipped);
	if (worn.length >= 2) {
		return undefined;
	}
	const candidates = rings
		.filter(
			(ring) =>
				!ring.equipped &&
				!ring.cursed &&
				!disabledKinds.has(ring.kind) &&
				RING_PREFERENCE_ORDER.includes(ring.kind) &&
				!worn.some((other) => other.kind === ring.kind),
		)
		.sort(
			(left, right) =>
				RING_PREFERENCE_ORDER.indexOf(left.kind) -
				RING_PREFERENCE_ORDER.indexOf(right.kind),
		);
	return candidates.at(0)?.itemId;
};
