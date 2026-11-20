import type { ArmorKind, ItemKind, WeaponKind } from "./events.js";
import { IDENTIFIABLE_ITEM_KINDS } from "./events.js";
import { calculateArmorClass } from "./items/equipmentStats.js";
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

/** Every non-weapon, non-armor kind. Food is total_winner()'s flat 2 apiece; the identify scroll (one kind here, five in the original) takes identify potion's 80. Wands carry no charges in this game, so the original's +20 per charge never applies. */
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
	"identify-scroll": 80,
	"enchant-weapon": 150,
	"enchant-armor": 160,
	"protect-armor": 250,
	"remove-curse-scroll": 105,
	"confuse-monster-scroll": 140,
	"hold-monster-scroll": 180,
	"regeneration-ring": 460,
	"sustenance-ring": 240,
	"stealth-ring": 470,
	"aggravate-monster-ring": 10,
	"slow-wand": 350,
	"teleport-wand": 340,
	"magic-missile-wand": 170,
};

/** What the Amulet of Yendor sells for at the end of a won run. */
const AMULET_WORTH = 1000;

/**
 * What one held item sells for at the end of a won run, as total_winner():
 * a weapon by 3 × its pluses plus its count, an armor by how far its armor
 * class sits below 9 and below its kind's own, everything else by its
 * kind's worth — halved (rounded down) while the kind is still
 * unidentified. Never negative.
 */
export const calculateItemWorth = (
	item: HeldItem,
	identifiedItemKinds: readonly ItemKind[],
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
			const worth = FLAT_WORTH[item.kind];
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
						total + calculateItemWorth(item, state.identifiedItemKinds),
					0,
				)
			);
		case "playing":
		case "exited":
		case "suspended":
			return state.goldCollected;
	}
};
