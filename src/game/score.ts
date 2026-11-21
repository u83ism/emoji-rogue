import { type ItemAppearances, RING_STONE_VALUES } from "./appearances.js";
import type { ArmorKind, ItemKind, WeaponKind } from "./events.js";
import { IDENTIFIABLE_ITEM_KINDS, isRingKind } from "./events.js";
import { calculateArmorClass } from "./items/equipment/equipmentStats.js";
import type { GameState, HeldItem } from "./state.js";

// Original Rogue's score is the purse alone (rip.c): a death costs a tenth
// of it (death()'s "death tax"), a quit keeps it as is (common.c's quit()),
// and a win sells off the whole pack on top (total_winner()). The worths
// below are each kind's `oi_worth` from extern.c's *_info[] tables.

const WEAPON_WORTH: Readonly<Record<WeaponKind, number>> = {
	mace: 8,
	"long-sword": 15,
	"short-bow": 15,
	arrow: 1,
	dagger: 3,
	"two-handed-sword": 75,
	dart: 2,
	shuriken: 5,
	spear: 5,
};

const ARMOR_WORTH: Readonly<Record<ArmorKind, number>> = {
	"leather-armor": 20,
	"ring-mail": 25,
	"studded-leather-armor": 20,
	"scale-mail": 30,
	"chain-mail": 75,
	"splint-mail": 80,
	"banded-mail": 90,
	"plate-mail": 150,
};

/** Every non-weapon, non-armor kind. Food is total_winner()'s flat 2 apiece; the identify scroll (one kind here, five in the original) takes identify potion's 80. A wand adds 20 per charge left (calculateItemWorth). */
const FLAT_WORTH: Readonly<
	Record<Exclude<ItemKind, "weapon" | "armor">, number>
> = {
	food: 2,
	"heal-potion": 130,
	poison: 5,
	strength: 150,
	confusion: 5,
	levitation: 75,
	blindness: 5,
	"raise-level": 250,
	"detect-monster": 130,
	hallucination: 5,
	"teleport-scroll": 165,
	"mapping-scroll": 150,
	"identify-potion-scroll": 80,
	"enchant-weapon": 150,
	"enchant-armor": 160,
	"protect-armor": 250,
	"remove-curse-scroll": 105,
	"confuse-monster-scroll": 140,
	"hold-monster-scroll": 180,
	"sleep-scroll": 5,
	"create-monster-scroll": 75,
	"aggravate-monsters-scroll": 20,
	"regeneration-ring": 460,
	"sustenance-ring": 240,
	"stealth-ring": 470,
	"aggravate-monster-ring": 10,
	"protection-ring": 400,
	"add-strength-ring": 400,
	"sustain-strength-ring": 280,
	"adornment-ring": 10,
	"dexterity-ring": 440,
	"increase-damage-ring": 400,
	"teleportation-ring": 30,
	"maintain-armor-ring": 380,
	"restore-strength-potion": 130,
	"extra-healing-potion": 200,
	"haste-self-potion": 190,
	"see-invisible-potion": 100,
	"see-invisible-ring": 310,
	"searching-ring": 420,
	"slow-wand": 350,
	"teleport-wand": 340,
	"magic-missile-wand": 170,
	"polymorph-wand": 310,
	"cancellation-wand": 280,
	"invisibility-wand": 5,
	"drain-life-wand": 300,
	"lightning-wand": 330,
	"cold-wand": 330,
	"fire-wand": 330,
	"light-wand": 250,
	"nothing-wand": 5,
	"teleport-to-wand": 50,
	"haste-monster-wand": 5,
};

/**
 * A non-weapon, non-armor item's worth before the unidentified halving:
 * its kind's, plus 20 per charge left on a wand; a ring with a value adds
 * 100 per point, or is worth just 10 at a value of 0 or less (rip.c).
 */
const calculateFlatWorth = (
	item: Exclude<HeldItem, { kind: "weapon" | "armor" }>,
	appearances: ItemAppearances | undefined,
): number => {
	/* a ring is worth its stone's value too (original Rogue's init_stones()) */
	const stoneValue =
		appearances !== undefined && isRingKind(item.kind)
			? (RING_STONE_VALUES[appearances.ringStones[item.kind]] ?? 0)
			: 0;
	if ("charges" in item) {
		return FLAT_WORTH[item.kind] + 20 * item.charges;
	}
	if ("bonus" in item) {
		return item.bonus > 0
			? FLAT_WORTH[item.kind] + stoneValue + item.bonus * 100
			: 10;
	}
	return FLAT_WORTH[item.kind] + stoneValue;
};

/** What the Amulet of Yendor sells for at the end of a won run. */
const AMULET_WORTH = 1000;

/**
 * What one held item sells for at the end of a won run, as total_winner():
 * a weapon by 3 × its pluses plus its count, an armor by how far its armor
 * class sits below 9 and below its kind's own, a wand by its kind's worth
 * plus 20 per charge left, everything else by its kind's worth — halved (rounded down) while the kind is still
 * unidentified. Never negative.
 */
export const calculateItemWorth = (
	item: HeldItem,
	identifiedItemKinds: readonly ItemKind[],
	appearances?: ItemAppearances,
): number => {
	switch (item.kind) {
		case "weapon":
			return Math.max(
				0,
				WEAPON_WORTH[item.weaponKind] *
					(3 * (item.hitBonus + item.damageBonus) + item.quantity),
			);
		case "armor":
			return Math.max(
				0,
				ARMOR_WORTH[item.armorKind] +
					(9 - calculateArmorClass(item)) * 100 +
					10 * item.defenseBonus,
			);
		default: {
			const worth = calculateFlatWorth(item, appearances);
			const unidentified =
				IDENTIFIABLE_ITEM_KINDS.includes(item.kind) &&
				!identifiedItemKinds.includes(item.kind);
			return unidentified ? Math.floor(worth / 2) : worth;
		}
	}
};

/**
 * The run's final score, original Rogue's way: the gold collected, less a
 * tenth (rounded down) on a death, plus the whole pack's worth (and the
 * amulet's) on a win. Pure — derived entirely from fields GameState already
 * carries.
 */
export const calculateScore = (state: GameState): number => {
	switch (state.status) {
		case "dead":
			return state.goldCollected - Math.floor(state.goldCollected / 10);
		case "won":
			return (
				state.goldCollected +
				(state.hasAmulet ? AMULET_WORTH : 0) +
				state.inventory.reduce(
					(total, item) =>
						total +
						calculateItemWorth(
							item,
							state.identifiedItemKinds,
							state.appearances,
						),
					0,
				)
			);
		case "playing":
		case "exited":
		case "suspended":
			return state.goldCollected;
	}
};
