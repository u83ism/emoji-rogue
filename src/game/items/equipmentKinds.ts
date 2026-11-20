import type { DamageDice } from "../combat/damage.js";
import type {
	ArmorKind,
	EquipmentVariant,
	ItemKind,
	WeaponKind,
} from "../events.js";
import type { HeldItem } from "../state.js";

// Original Rogue 5.4's weapon and armor tables (extern.c's weap_info,
// weapons.c's init_dam and extern.c's arm_info/a_class), kept apart from
// balance.ts for the same reason as enemies/enemyStats.ts: these are the
// original's numbers, not tuning knobs.

export interface WeaponStats {
	/** What a hit with it rolls when wielded. */
	readonly damageDice: DamageDice;
	/** What it rolls when thrown — for a kind with a `launcher`, only while that launcher is wielded (otherwise damageDice). */
	readonly hurlDice: DamageDice;
	/** The weapon that must be wielded for a thrown one to use hurlDice (the bow, for arrows); it also lends its own bonuses to the shot. */
	readonly launcher?: WeaponKind;
	/** How many come in one find. A kind whose stackMax is above 1 is held as a stack in one inventory slot. */
	readonly stackMin: number;
	readonly stackMax: number;
	/** Relative odds that a found weapon is this kind. */
	readonly spawnWeight: number;
}

const dice = (count: number, sides: number): DamageDice => ({ count, sides });
const single = { stackMin: 1, stackMax: 1 };
/** Original Rogue's `rnd(8) + 8` for arrows, darts and shuriken. */
const bundle = { stackMin: 8, stackMax: 15 };

export const WEAPON_STATS: Readonly<Record<WeaponKind, WeaponStats>> = {
	mace: {
		damageDice: dice(2, 4),
		hurlDice: dice(1, 3),
		...single,
		spawnWeight: 11,
	},
	"long-sword": {
		damageDice: dice(3, 4),
		hurlDice: dice(1, 2),
		...single,
		spawnWeight: 11,
	},
	"short-bow": {
		damageDice: dice(1, 1),
		hurlDice: dice(1, 1),
		...single,
		spawnWeight: 12,
	},
	arrow: {
		damageDice: dice(1, 1),
		hurlDice: dice(2, 3),
		launcher: "short-bow",
		...bundle,
		spawnWeight: 12,
	},
	/* original Rogue's `rnd(4) + 2` */
	dagger: {
		damageDice: dice(1, 6),
		hurlDice: dice(1, 4),
		stackMin: 2,
		stackMax: 5,
		spawnWeight: 8,
	},
	"two-handed-sword": {
		damageDice: dice(4, 4),
		hurlDice: dice(1, 2),
		...single,
		spawnWeight: 10,
	},
	dart: {
		damageDice: dice(1, 1),
		hurlDice: dice(1, 3),
		...bundle,
		spawnWeight: 12,
	},
	shuriken: {
		damageDice: dice(1, 2),
		hurlDice: dice(2, 4),
		...bundle,
		spawnWeight: 12,
	},
	spear: {
		damageDice: dice(2, 3),
		hurlDice: dice(1, 6),
		...single,
		spawnWeight: 12,
	},
};

/** Whether finds of `weaponKind` come several at a time and share one inventory slot. */
export const isStackableWeaponKind = (weaponKind: WeaponKind): boolean =>
	WEAPON_STATS[weaponKind].stackMax > 1;

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
