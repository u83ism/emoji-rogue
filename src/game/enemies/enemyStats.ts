import type { DamageDice } from "../combat/damage.js";
import type { EnemyKind } from "../events.js";

// Original Rogue 5.4's monsters[] table (extern.c), one row per kind:
// level (the table's "class"), armor class (lower = harder to hit), one
// damage die per attack it makes each turn, and base experience. Kept apart
// from balance.ts on purpose — these are the original's numbers, not tuning
// knobs. See docs/rogue-5.4-spec.md.

export interface EnemyStats {
	readonly level: number;
	/** Lower is harder to hit — the player's to-hit chance adds this number (see combat/hitChance.ts). */
	readonly armorClass: number;
	/** Every entry is one separate to-hit roll per turn. A 0-count die lands for 0 damage (aquator: the hit only rusts). */
	readonly attacks: readonly DamageDice[];
	readonly experience: number;
}

const dice = (count: number, sides: number): DamageDice => ({ count, sides });

/**
 * Three kinds carry another name and emoji than their original Rogue 5.4
 * monster, because no stable emoji shows the original (docs/design.md's
 * "まず本家ありき"): scorpion = rattlesnake, rhinoceros = black unicorn,
 * and thief = leprechaun (kept by the developer's choice). Their numbers
 * are the original's all the same. Two 0x0 rows are the original's too: the ice monster's real
 * attack is its freeze (iceMonsterFreeze.ts), the venus flytrap's is the
 * hold that grows with every bite (flytrapHold.ts).
 */
export const ENEMY_STATS: Readonly<Record<EnemyKind, EnemyStats>> = {
	aquator: {
		level: 5,
		armorClass: 2,
		attacks: [dice(0, 0), dice(0, 0)],
		experience: 20,
	},
	bat: { level: 1, armorClass: 3, attacks: [dice(1, 2)], experience: 1 },
	centaur: {
		level: 4,
		armorClass: 4,
		attacks: [dice(1, 2), dice(1, 5), dice(1, 5)],
		experience: 17,
	},
	dragon: {
		level: 10,
		armorClass: -1,
		attacks: [dice(1, 8), dice(1, 8), dice(3, 10)],
		experience: 5000,
	},
	emu: { level: 1, armorClass: 7, attacks: [dice(1, 2)], experience: 2 },
	"venus-flytrap": {
		level: 8,
		armorClass: 3,
		attacks: [dice(0, 0)],
		experience: 80,
	},
	griffin: {
		level: 13,
		armorClass: 2,
		attacks: [dice(4, 3), dice(3, 5)],
		experience: 2000,
	},
	hobgoblin: { level: 1, armorClass: 5, attacks: [dice(1, 8)], experience: 3 },
	"ice-monster": {
		level: 1,
		armorClass: 9,
		attacks: [dice(0, 0)],
		experience: 5,
	},
	jabberwock: {
		level: 15,
		armorClass: 6,
		attacks: [dice(2, 12), dice(2, 4)],
		experience: 3000,
	},
	kestrel: { level: 1, armorClass: 7, attacks: [dice(1, 4)], experience: 1 },
	thief: { level: 3, armorClass: 8, attacks: [dice(1, 1)], experience: 10 },
	medusa: {
		level: 8,
		armorClass: 2,
		attacks: [dice(3, 4), dice(3, 4), dice(2, 5)],
		experience: 200,
	},
	nymph: { level: 3, armorClass: 9, attacks: [dice(0, 0)], experience: 37 },
	orc: { level: 1, armorClass: 6, attacks: [dice(1, 8)], experience: 5 },
	phantom: { level: 8, armorClass: 3, attacks: [dice(4, 4)], experience: 120 },
	quagga: {
		level: 3,
		armorClass: 3,
		attacks: [dice(1, 5), dice(1, 5)],
		experience: 15,
	},
	scorpion: { level: 2, armorClass: 3, attacks: [dice(1, 6)], experience: 9 },
	snake: { level: 1, armorClass: 5, attacks: [dice(1, 3)], experience: 2 },
	troll: {
		level: 6,
		armorClass: 4,
		attacks: [dice(1, 8), dice(1, 8), dice(2, 6)],
		experience: 120,
	},
	rhinoceros: {
		level: 7,
		armorClass: -2,
		attacks: [dice(1, 9), dice(1, 9), dice(2, 9)],
		experience: 190,
	},
	vampire: {
		level: 8,
		armorClass: 1,
		attacks: [dice(1, 10)],
		experience: 350,
	},
	wraith: { level: 5, armorClass: 4, attacks: [dice(1, 6)], experience: 55 },
	xeroc: { level: 7, armorClass: 7, attacks: [dice(4, 4)], experience: 100 },
	yeti: {
		level: 4,
		armorClass: 6,
		attacks: [dice(1, 6), dice(1, 6)],
		experience: 50,
	},
	zombie: { level: 2, armorClass: 8, attacks: [dice(1, 8)], experience: 6 },
};

/** An enemy's HP is rolled once at spawn as `level` dice of this many sides (original Rogue's `roll(level, 8)`). */
export const ENEMY_HP_DICE_SIDES = 8;

/**
 * Experience for defeating one enemy: the table's base value, 10 per
 * `levelBonus` (balance.ts's calculateEnemyLevelBonus — deep floors), plus
 * original Rogue's exp_add() — a share of that individual's rolled max HP
 * (1/8 at level 1, 1/6 above), multiplied x4 above level 6 and x20 above
 * level 9, all by the boosted level.
 */
export const calculateEnemyExperienceReward = (
	kind: EnemyKind,
	maxHp: number,
	levelBonus = 0,
): number => {
	const level = ENEMY_STATS[kind].level + levelBonus;
	const share = Math.floor(maxHp / (level === 1 ? 8 : 6));
	const multiplier = level > 9 ? 20 : level > 6 ? 4 : 1;
	return ENEMY_STATS[kind].experience + levelBonus * 10 + share * multiplier;
};

/**
 * The kinds that never arrive as wandering monsters — the blanks in original
 * Rogue's wand_mons[] (ice monster, leprechaun, nymph, venus flytrap, xeroc,
 * dragon), under this game's names for them.
 */
export const NON_WANDERING_ENEMY_KINDS: readonly EnemyKind[] = [
	"ice-monster",
	"thief",
	"nymph",
	"venus-flytrap",
	"xeroc",
	"dragon",
];

/**
 * Original Rogue's lvl_mons[] — the 26 kinds "in rough order of
 * vorpalness". A floor draws from a 10-entry window of this list that
 * slides one entry deeper per floor (see floor/enemies.ts).
 */
export const ENEMY_DEPTH_ORDER: readonly EnemyKind[] = [
	"kestrel",
	"emu",
	"bat",
	"snake",
	"hobgoblin",
	"ice-monster",
	"scorpion",
	"orc",
	"zombie",
	"thief",
	"centaur",
	"quagga",
	"aquator",
	"nymph",
	"yeti",
	"venus-flytrap",
	"troll",
	"wraith",
	"phantom",
	"xeroc",
	"rhinoceros",
	"medusa",
	"vampire",
	"griffin",
	"jabberwock",
	"dragon",
];
