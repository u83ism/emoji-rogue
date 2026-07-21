import type { ItemKind } from "../game/events.js";
import type { GameState, HeldItem } from "../game/state.js";

type SwordItem = Extract<HeldItem, { kind: "sword" }>;
type ArmorItem = Extract<HeldItem, { kind: "armor" }>;
type RingItem = Extract<
	HeldItem,
	{
		kind:
			| "regeneration-ring"
			| "sustenance-ring"
			| "stealth-ring"
			| "awareness-ring"
			| "aggravate-monster-ring";
	}
>;

const isSwordItem = (item: HeldItem): item is SwordItem =>
	item.kind === "sword";
const isArmorItem = (item: HeldItem): item is ArmorItem =>
	item.kind === "armor";
const isRingItem = (item: HeldItem): item is RingItem =>
	item.kind === "regeneration-ring" ||
	item.kind === "sustenance-ring" ||
	item.kind === "stealth-ring" ||
	item.kind === "awareness-ring" ||
	item.kind === "aggravate-monster-ring";

/**
 * Best-first ring preference: sustenance first (the food economy is the
 * dominant killer — see docs/tasks/game.md's balance backlog), then
 * regeneration (passive combat sustain), then the awareness/stealth utility
 * pair. `aggravate-monster-ring` is deliberately absent — equipping it wakes
 * every enemy on the floor at once, a trap the bot should never opt into.
 */
const RING_PREFERENCE_ORDER: readonly ItemKind[] = [
	"sustenance-ring",
	"regeneration-ring",
	"awareness-ring",
	"stealth-ring",
];

/**
 * The itemId of a sword worth equipping this turn, if any: the best-attack
 * held-but-unequipped sword, only when it beats (or nothing beats) whatever
 * sword is currently equipped — swords/armor/rings toggle equip state rather
 * than being consumed (see items/equipment.ts), so blindly re-using an
 * already-equipped one would unequip it instead of helping.
 */
export const decideSwordToEquip = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
): number | undefined => {
	if (disabledKinds.has("sword")) {
		return undefined;
	}
	const swords = state.inventory.filter(isSwordItem);
	const equipped = swords.find((sword) => sword.equipped);
	const bestUnequipped = swords
		.filter((sword) => !sword.equipped)
		.sort((left, right) => right.attackBonus - left.attackBonus)
		.at(0);
	if (bestUnequipped === undefined) {
		return undefined;
	}
	if (
		equipped !== undefined &&
		equipped.attackBonus >= bestUnequipped.attackBonus
	) {
		return undefined;
	}
	return bestUnequipped.itemId;
};

/** Same idea as decideSwordToEquip, for defenseBonus instead of attackBonus. */
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
		.sort((left, right) => right.defenseBonus - left.defenseBonus)
		.at(0);
	if (bestUnequipped === undefined) {
		return undefined;
	}
	if (
		equipped !== undefined &&
		equipped.defenseBonus >= bestUnequipped.defenseBonus
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
