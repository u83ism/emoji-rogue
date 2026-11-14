import type { DamageDice } from "../damage.js";
import type {
	ArmorKind,
	EquipmentVariant,
	ItemKind,
	WeaponKind,
} from "../events.js";
import type { HeldItem } from "../state.js";

// Original Rogue 5.4's weapon and armor tables (extern.c's weap_info/
// init_dam and arm_info/a_class), kept apart from balance.ts for the same
// reason as enemies/enemyStats.ts: these are the original's numbers, not
// tuning knobs. Only the five melee weapons are here — the bow, arrow, dart
// and shuriken wait for a throw command (docs/tasks/game.md).

export interface WeaponStats {
	/** What a hit with it rolls when wielded. */
	readonly damageDice: DamageDice;
	/** Relative odds that a found weapon is this kind. */
	readonly spawnWeight: number;
}

export const WEAPON_STATS: Readonly<Record<WeaponKind, WeaponStats>> = {
	mace: { damageDice: { count: 2, sides: 4 }, spawnWeight: 11 },
	"long-sword": { damageDice: { count: 3, sides: 4 }, spawnWeight: 11 },
	dagger: { damageDice: { count: 1, sides: 6 }, spawnWeight: 8 },
	"two-handed-sword": { damageDice: { count: 4, sides: 4 }, spawnWeight: 10 },
	spear: { damageDice: { count: 2, sides: 3 }, spawnWeight: 12 },
};

export interface ArmorStats {
	/** The armor class it gives before its own enchantment — lower is harder to hit. */
	readonly armorClass: number;
	/** Relative odds that a found armor is this kind. */
	readonly spawnWeight: number;
}

export const ARMOR_STATS: Readonly<Record<ArmorKind, ArmorStats>> = {
	"leather-armor": { armorClass: 8, spawnWeight: 20 },
	"ring-mail": { armorClass: 7, spawnWeight: 15 },
	"studded-leather-armor": { armorClass: 7, spawnWeight: 15 },
	"scale-mail": { armorClass: 6, spawnWeight: 13 },
	"chain-mail": { armorClass: 5, spawnWeight: 12 },
	"splint-mail": { armorClass: 4, spawnWeight: 10 },
	"banded-mail": { armorClass: 4, spawnWeight: 10 },
	"plate-mail": { armorClass: 3, spawnWeight: 5 },
};

/** Rust never takes an armor's class past this (original Rogue's rust_armor stops at 9). */
export const RUST_ARMOR_CLASS_LIMIT = 9;
/** The one armor kind rust cannot touch at all. */
export const RUSTPROOF_ARMOR_KIND: ArmorKind = "leather-armor";

/**
 * How an event names a held item: its ItemKind, plus — for a weapon or
 * armor — which one it is, so the shell can say "mace" instead of "weapon".
 */
export const toItemEventPayload = (
	item: HeldItem,
): { readonly kind: ItemKind; readonly variant?: EquipmentVariant } => {
	if (item.kind === "weapon") {
		return { kind: item.kind, variant: item.weaponKind };
	}
	if (item.kind === "armor") {
		return { kind: item.kind, variant: item.armorKind };
	}
	return { kind: item.kind };
};
