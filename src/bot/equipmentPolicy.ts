import type { ItemKind } from "../game/events.js";
import { WEAPON_STATS } from "../game/items/equipmentKinds.js";
import { calculateArmorClass } from "../game/items/equipmentStats.js";
import type { GameState, HeldItem } from "../game/state.js";

type WeaponItem = Extract<HeldItem, { kind: "weapon" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;
type RingItem = Extract<
	HeldItem,
	{
		kind:
			| "regeneration-ring"
			| "sustenance-ring"
			| "stealth-ring"
			| "aggravate-monster-ring";
	}
>;

const isWeaponItem = (item: HeldItem): item is WeaponItem =>
	item.kind === "weapon";
const isArmorItem = (item: HeldItem): item is ArmorItem =>
	item.kind === "armor";
const isRingItem = (item: HeldItem): item is RingItem =>
	item.kind === "regeneration-ring" ||
	item.kind === "sustenance-ring" ||
	item.kind === "stealth-ring" ||
	item.kind === "aggravate-monster-ring";

/**
 * Best-first ring preference: sustenance first (the food economy is the
 * dominant killer — see docs/tasks/game-notes.md's balance notes), then
 * regeneration (passive combat sustain), then the stealth
 * utility ring. `aggravate-monster-ring` is deliberately absent — equipping it wakes
 * every enemy on the floor at once, a trap the bot should never opt into.
 */
const RING_PREFERENCE_ORDER: readonly ItemKind[] = [
	"sustenance-ring",
	"regeneration-ring",
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
 * The itemId of a ring worth equipping this turn, if any. Only one ring can
 * be worn at all (regardless of kind — see items/rings.ts), so this picks
 * the best held-but-unequipped kind by RING_PREFERENCE_ORDER and only swaps
 * in when it outranks whatever is currently worn.
 */
export const decideRingToEquip = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
): number | undefined => {
	const availableKinds = RING_PREFERENCE_ORDER.filter(
		(kind) => !disabledKinds.has(kind),
	);
	const rings = state.inventory.filter(isRingItem);
	const equipped = rings.find((ring) => ring.equipped);
	const equippedRank = equipped ? availableKinds.indexOf(equipped.kind) : -1;

	let bestCandidate: RingItem | undefined;
	let bestRank = Number.POSITIVE_INFINITY;
	for (const ring of rings) {
		if (ring.equipped) {
			continue;
		}
		const rank = availableKinds.indexOf(ring.kind);
		if (rank === -1) {
			continue; /* disabled, or aggravate-monster-ring — never a candidate */
		}
		if (rank < bestRank) {
			bestRank = rank;
			bestCandidate = ring;
		}
	}
	if (bestCandidate === undefined) {
		return undefined;
	}
	if (equippedRank !== -1 && equippedRank <= bestRank) {
		return undefined; /* already wearing something at least as good */
	}
	return bestCandidate.itemId;
};
