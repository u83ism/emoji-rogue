/* file-size-exception: 調整ノブの単一責務カタログ — 1種1エントリで、分割するとノブが散る(2026-07-18裁可) */
// Combat tuning knobs, all in one place. Values are provisional and expected
// to change after real-terminal playtesting (docs/tasks/game-history.md, milestone 5).
// Damage is a fixed amount — no dice — so combat stays deterministic
// (docs/tasks/game-history.md milestone 15: a normal-distribution roll was tried and
// rolled back, but the reusable rollDamage() in damage.ts is kept for when
// dice-based damage is wanted again).

import type { EnemyKind, TrapKind } from "./events.js";

export const PLAYER_MAX_HP = 10;
export const PLAYER_ATTACK_DAMAGE = 1;
/** However high playerDefense climbs, an enemy attack always deals at least this much. */
export const MIN_DAMAGE_TAKEN = 1;
/**
 * Standard deviation for damage.ts's rollDamage(), which nothing currently
 * calls — combat is deterministic for now (see the comment above). Kept so
 * the normal-distribution pattern is ready to wire back in later.
 */
export const DAMAGE_VARIANCE_STDDEV = 0.5;

/**
 * Max distinct item kinds the player can hold at once — one slot per held
 * kind (stacking more of an already-held kind never costs a slot). Picking
 * up a new kind is refused once at capacity — see applyItemPickup. Matches
 * the base どうぐ袋 capacity of Fushigi no Dungeon: Shiren the Wanderer (the
 * series this project's inventory UX takes its cues from); that series lets
 * the capacity grow via found items, which this project does not (yet).
 */
export const INVENTORY_CAPACITY = 20;

export const ZOMBIE_MAX_HP = 2;
export const ZOMBIE_ATTACK_DAMAGE = 1;
export const ZOMBIE_ACTIONS_PER_TURN = 1;
export const ZOMBIE_COUNT_BASE = 3;

// A glass cannon: one hit kills it, but it acts twice per player turn, so
// standing next to one costs as much HP as standing next to two zombies.
export const BAT_MAX_HP = 1;
export const BAT_ATTACK_DAMAGE = 1;
export const BAT_ACTIONS_PER_TURN = 2;
export const BAT_COUNT_BASE = 2;

// Never deals HP damage — it steals gold on contact and flees instead (see
// advanceEnemies's kind-specific branch) and does not scale with depth like
// zombie/bat; it spawns via THIEF_SPAWN_CHANCE_PERCENT, an independent
// per-floor roll like sword/armor.
export const THIEF_MAX_HP = 2;
export const THIEF_ATTACK_DAMAGE = 0;
export const THIEF_ACTIONS_PER_TURN = 1;
export const THIEF_STEAL_AMOUNT = 10;
export const THIEF_SPAWN_CHANCE_PERCENT = 20;

// The item-stealing counterpart to the thief: never deals damage, steals one
// random held item stack (instead of gold) on contact and flees. Same
// independent-per-floor spawn pattern, no depth scaling.
export const NYMPH_MAX_HP = 1;
export const NYMPH_ATTACK_DAMAGE = 0;
export const NYMPH_ACTIONS_PER_TURN = 1;
export const NYMPH_SPAWN_CHANCE_PERCENT = 20;

// Neither flees nor scales with depth like zombie/bat — a sturdier enemy
// that stands and fights, whose hits have a chance to also rust the
// player's armor (see advanceEnemies's playerDefense accumulator).
export const AQUATOR_MAX_HP = 3;
export const AQUATOR_ATTACK_DAMAGE = 1;
export const AQUATOR_ACTIONS_PER_TURN = 1;
/** Chance (out of 100), independently rolled every time an aquator's attack lands, that it also rusts armor. */
export const AQUATOR_RUST_CHANCE_PERCENT = 33;
export const AQUATOR_SPAWN_CHANCE_PERCENT = 20;

// A sturdier straight-up melee attacker than aquator — no special behavior of
// its own in advanceEnemies (same "attack if adjacent, otherwise chase/wander"
// as zombie/bat); its distinguishing trait is combat.ts's applyEnemyHit
// dropping a bonus gold pile on death (see GOLD_AMOUNT_MIN/MAX), echoing
// original Rogue's gold-hoarding orc. Independent per-floor spawn, no depth
// scaling — same idiom as thief/nymph/aquator.
export const ORC_MAX_HP = 4;
export const ORC_ATTACK_DAMAGE = 2;
export const ORC_ACTIONS_PER_TURN = 1;
export const ORC_SPAWN_CHANCE_PERCENT = 20;

// A boss-tier melee attacker, sturdier and harder-hitting than any other
// enemy, differentiated purely by parameters — same "no advanceEnemies
// branch" idiom as zombie/bat. Independent per-floor spawn like thief/nymph/
// aquator/orc, but rare (same rate as ring/wand drops).
export const DRAGON_MAX_HP = 8;
export const DRAGON_ATTACK_DAMAGE = 4;
export const DRAGON_ACTIONS_PER_TURN = 1;
export const DRAGON_SPAWN_CHANCE_PERCENT = 8;

// Another "parameters only" melee attacker, positioned between orc and
// dragon on every axis. No single-codepoint stable emoji depicts a yeti, so
// glyphs.ts substitutes a bear as the nearest mountain-beast stand-in.
export const YETI_MAX_HP = 5;
export const YETI_ATTACK_DAMAGE = 3;
export const YETI_ACTIONS_PER_TURN = 1;
export const YETI_SPAWN_CHANCE_PERCENT = 15;

// Low HP but a harder bite than zombie/bat — the balance point is the extra
// damage offsetting how easily it dies. Independent per-floor spawn, no
// depth scaling — same idiom as thief/nymph/aquator/orc/yeti.
export const SNAKE_MAX_HP = 2;
export const SNAKE_ATTACK_DAMAGE = 2;
export const SNAKE_ACTIONS_PER_TURN = 1;
export const SNAKE_SPAWN_CHANCE_PERCENT = 20;

// Stands and fights like aquator rather than fleeing — every landed hit
// heals it for a percentage of the damage dealt, capped at VAMPIRE_MAX_HP
// (see vampireLifesteal.ts). Independent per-floor spawn, no depth scaling.
export const VAMPIRE_MAX_HP = 4;
export const VAMPIRE_ATTACK_DAMAGE = 2;
export const VAMPIRE_ACTIONS_PER_TURN = 1;
/** Percentage (floored) of landed damage a vampire heals itself for — see vampireLifesteal.ts's resolveVampireLifesteal. */
export const VAMPIRE_LIFESTEAL_PERCENT = 50;
export const VAMPIRE_SPAWN_CHANCE_PERCENT = 15;
/**
 * A vampire's own heal (floor(VAMPIRE_ATTACK_DAMAGE * VAMPIRE_LIFESTEAL_PERCENT / 100) = 1/turn)
 * exactly cancels an unarmed player's PLAYER_ATTACK_DAMAGE (1/turn), making it an unkillable
 * stalemate before the player finds a sword or strength potion. Gating the spawn to floor 8+
 * (2026-07-23 player report, raised 3→8 same day: floor 3 still felt too early) pushes it later
 * than dragon/yeti, matching its ENEMY_EXPERIENCE_REWARD placement between the two.
 */
export const VAMPIRE_MIN_SPAWN_FLOOR = 8;

// Eight more "parameters only" melee attackers (no advanceEnemies branch of
// their own — same idiom as orc/dragon/yeti), added 2026-07-28 to widen the
// enemy roster toward original Rogue's full 26-letter cast. Chosen as a first
// batch specifically because none of them need a new mechanic: every other
// unimplemented original monster (Griffin/Troll's regen, Icky Thing's
// blindness, Venus Flytrap's stationary hold, Medusa's gaze, Phantom's
// invisibility, Wraith's stat drain, Xeroc's gold mimicry) needs new game
// systems and is left for later milestones — see docs/tasks/game.md's
// backlog. Spawn percentages are set conservatively (roughly half of an
// existing "common" kind's rate) since adding eight more independent
// per-floor rolls on top of the existing eight meaningfully raises enemy
// density — first-pass numbers, expect retuning after playtesting like every
// other balance.ts value.

// Weakest of the batch — below zombie in every stat, original Rogue's
// earliest and most common trash mob.
export const RAT_MAX_HP = 1;
export const RAT_ATTACK_DAMAGE = 1;
export const RAT_ACTIONS_PER_TURN = 1;
export const RAT_SPAWN_CHANCE_PERCENT = 12;

// A glass cannon in the same vein as snake — even less HP, still bites hard.
export const EMU_MAX_HP = 1;
export const EMU_ATTACK_DAMAGE = 2;
export const EMU_ACTIONS_PER_TURN = 1;
export const EMU_SPAWN_CHANCE_PERCENT = 10;

// A second "acts twice per turn" kind alongside bat, tuned meaningfully more
// dangerous than bat (same speed, sharper attack) rather than a plain
// reskin.
export const KESTREL_MAX_HP = 1;
export const KESTREL_ATTACK_DAMAGE = 2;
export const KESTREL_ACTIONS_PER_TURN = 2;
export const KESTREL_SPAWN_CHANCE_PERCENT = 8;

// A mid-tier grunt, weaker cousin of orc/centaur without either of their
// gimmicks (no gold drop, no extra HP).
export const HOBGOBLIN_MAX_HP = 3;
export const HOBGOBLIN_ATTACK_DAMAGE = 2;
export const HOBGOBLIN_ACTIONS_PER_TURN = 1;
export const HOBGOBLIN_SPAWN_CHANCE_PERCENT = 15;

// A sturdier mid-tier melee attacker, comparable to orc but without its
// gold-drop gimmick.
export const CENTAUR_MAX_HP = 4;
export const CENTAUR_ATTACK_DAMAGE = 2;
export const CENTAUR_ACTIONS_PER_TURN = 1;
export const CENTAUR_SPAWN_CHANCE_PERCENT = 12;

// The third "acts twice per turn" kind — two real hits at moderate power
// makes it the most dangerous of the fast trio (bat/kestrel/quagga).
export const QUAGGA_MAX_HP = 3;
export const QUAGGA_ATTACK_DAMAGE = 2;
export const QUAGGA_ACTIONS_PER_TURN = 2;
export const QUAGGA_SPAWN_CHANCE_PERCENT = 8;

// Upper-mid tier, positioned between yeti and dragon on every axis.
export const UR_VILE_MAX_HP = 5;
export const UR_VILE_ATTACK_DAMAGE = 3;
export const UR_VILE_ACTIONS_PER_TURN = 1;
export const UR_VILE_SPAWN_CHANCE_PERCENT = 8;

// A second boss-tier attacker alongside dragon — comparably rare and
// dangerous, gated to deeper floors the same way VAMPIRE_MIN_SPAWN_FLOOR
// gates vampire.
export const JABBERWOCK_MAX_HP = 7;
export const JABBERWOCK_ATTACK_DAMAGE = 4;
export const JABBERWOCK_ACTIONS_PER_TURN = 1;
export const JABBERWOCK_SPAWN_CHANCE_PERCENT = 6;
export const JABBERWOCK_MIN_SPAWN_FLOOR = 6;

// The remaining eight original-Rogue monsters, each needing a genuinely new
// advanceEnemies mechanic (added 2026-07-28, second half of the roster —
// see docs/tasks/game.md milestone 101's backlog note). Gated to a
// minFloor where the mechanic makes them meaningfully more dangerous than a
// same-tier "parameters only" attacker, same reasoning as
// VAMPIRE_MIN_SPAWN_FLOOR.

// Fast (like bat/kestrel/quagga) AND passively regenerates — see
// enemyRegen.ts. Gated deeper than troll since the two mechanics stack.
export const GRIFFIN_MAX_HP = 6;
export const GRIFFIN_ATTACK_DAMAGE = 3;
export const GRIFFIN_ACTIONS_PER_TURN = 2;
export const GRIFFIN_SPAWN_CHANCE_PERCENT = 6;
export const GRIFFIN_MIN_SPAWN_FLOOR = 5;
/** HP regenerated per awake turn while below GRIFFIN_MAX_HP — see enemyRegen.ts. */
export const GRIFFIN_REGEN_AMOUNT = 1;

// Not fast, but regenerates more per turn than griffin — its own signature
// trait instead of a lesser copy of griffin's.
export const TROLL_MAX_HP = 6;
export const TROLL_ATTACK_DAMAGE = 3;
export const TROLL_ACTIONS_PER_TURN = 1;
export const TROLL_SPAWN_CHANCE_PERCENT = 8;
export const TROLL_MIN_SPAWN_FLOOR = 4;
/** HP regenerated per awake turn while below TROLL_MAX_HP — see enemyRegen.ts. */
export const TROLL_REGEN_AMOUNT = 2;

// Blind: only wakes on adjacency (never on being seen), and never chases
// once awake — always wanders, same as a confused enemy, except it can still
// wake up and it is never actually confused. See advanceEnemies. Weak
// otherwise and not gated — original Rogue's Icky Thing is an early nuisance.
export const ICKY_THING_MAX_HP = 2;
export const ICKY_THING_ATTACK_DAMAGE = 1;
export const ICKY_THING_ACTIONS_PER_TURN = 1;
export const ICKY_THING_SPAWN_CHANCE_PERCENT = 15;

// Stationary: never chases or wanders, only ever attacks when the player
// steps adjacent to it (see advanceEnemies). Original Rogue's Venus Flytrap
// also physically holds the player in place while adjacent — deliberately
// not implemented here (would need a new constraint inside advanceTurn.ts's
// applyMove, see docs/tasks/game.md milestone 101's follow-up note); for now
// the only penalty for walking away is forfeiting its experience.
export const VENUS_FLYTRAP_MAX_HP = 3;
export const VENUS_FLYTRAP_ATTACK_DAMAGE = 2;
export const VENUS_FLYTRAP_ACTIONS_PER_TURN = 1;
export const VENUS_FLYTRAP_SPAWN_CHANCE_PERCENT = 10;

// A ranged gaze instead of chasing while visible but not adjacent — see
// advanceEnemies. Reuses the player's own confusedTurnsRemaining field/tick,
// same "same field, different source" idiom as the sleeping gas trap reusing
// paralyzedTurnsRemaining.
export const MEDUSA_MAX_HP = 5;
export const MEDUSA_ATTACK_DAMAGE = 2;
export const MEDUSA_ACTIONS_PER_TURN = 1;
export const MEDUSA_SPAWN_CHANCE_PERCENT = 6;
export const MEDUSA_MIN_SPAWN_FLOOR = 5;
/** Chance (out of 100), rolled independently every turn a medusa is visible but not adjacent, that its gaze lands — same "roll every eligible turn" idiom as WAKE_CHANCE_PERCENT. */
export const MEDUSA_GAZE_CHANCE_PERCENT = 33;
/** Shorter than a confusion potion's duration (see items/potions.ts) since a medusa's gaze can reapply every turn it stays visible. */
export const MEDUSA_GAZE_CONFUSE_DURATION = 6;

// Invisible unless adjacent (or detected — see frame.ts's buildFrameGrid).
// No advanceEnemies branch of its own: it fights exactly like a
// "parameters only" attacker once you bump into it, the danger is purely
// that you cannot see it coming.
export const PHANTOM_MAX_HP = 3;
export const PHANTOM_ATTACK_DAMAGE = 2;
export const PHANTOM_ACTIONS_PER_TURN = 1;
export const PHANTOM_SPAWN_CHANCE_PERCENT = 8;
export const PHANTOM_MIN_SPAWN_FLOOR = 3;

// Every landed hit permanently lowers playerMaxHp — see wraithDrain.ts.
// Gated like vampire: a permanent debuff is dangerous enough to delay.
export const WRAITH_MAX_HP = 4;
export const WRAITH_ATTACK_DAMAGE = 2;
export const WRAITH_ACTIONS_PER_TURN = 1;
export const WRAITH_SPAWN_CHANCE_PERCENT = 8;
export const WRAITH_MIN_SPAWN_FLOOR = 4;
/** Permanent playerMaxHp lost per landed hit — see wraithDrain.ts. Never drains playerMaxHp below 1. */
export const WRAITH_DRAIN_AMOUNT = 1;

// Disguised as a gold pile while still asleep (see frame.ts's
// buildFrameGrid) — the instant it wakes (the same WAKE_CHANCE_PERCENT roll
// every sleeping enemy uses) it draws as its real glyph instead. No
// advanceEnemies branch of its own beyond that — a "parameters only"
// attacker once revealed. Not gated: the disguise itself is what makes it
// dangerous even early.
export const XEROC_MAX_HP = 4;
export const XEROC_ATTACK_DAMAGE = 3;
export const XEROC_ACTIONS_PER_TURN = 1;
export const XEROC_SPAWN_CHANCE_PERCENT = 10;

/**
 * All enemies spawn asleep (see floor.ts) and take no action until they wake
 * (see advanceEnemies) — attacking a still-sleeping enemy is a sneak attack,
 * dealing this many times the normal damage (matching original Rogue).
 */
export const SNEAK_ATTACK_MULTIPLIER = 3;
/**
 * Chance (out of 100), rolled independently every turn a sleeping enemy is
 * adjacent to or within sight of the player, that it wakes up this turn.
 * Deliberately not "wakes for sure the instant it's adjacent/visible" — a
 * bump attack only ever happens from an already-adjacent tile (movement is
 * the only way to become adjacent, so there is always a prior turn standing
 * next to the enemy), so a guaranteed-on-adjacency wake would make every
 * approach wake the enemy one full turn before the player could ever attack,
 * leaving no room for a real sneak attack.
 */
export const WAKE_CHANCE_PERCENT = 33;

/**
 * Per-kind lookup tables so `advanceEnemies`/`floor.ts` stay kind-agnostic —
 * adding a third enemy kind means adding one entry here, not a new branch
 * elsewhere.
 */
export const ENEMY_MAX_HP: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_MAX_HP,
	bat: BAT_MAX_HP,
	thief: THIEF_MAX_HP,
	nymph: NYMPH_MAX_HP,
	aquator: AQUATOR_MAX_HP,
	orc: ORC_MAX_HP,
	dragon: DRAGON_MAX_HP,
	yeti: YETI_MAX_HP,
	snake: SNAKE_MAX_HP,
	vampire: VAMPIRE_MAX_HP,
	rat: RAT_MAX_HP,
	emu: EMU_MAX_HP,
	kestrel: KESTREL_MAX_HP,
	hobgoblin: HOBGOBLIN_MAX_HP,
	centaur: CENTAUR_MAX_HP,
	quagga: QUAGGA_MAX_HP,
	"ur-vile": UR_VILE_MAX_HP,
	jabberwock: JABBERWOCK_MAX_HP,
	griffin: GRIFFIN_MAX_HP,
	troll: TROLL_MAX_HP,
	"icky-thing": ICKY_THING_MAX_HP,
	"venus-flytrap": VENUS_FLYTRAP_MAX_HP,
	medusa: MEDUSA_MAX_HP,
	phantom: PHANTOM_MAX_HP,
	wraith: WRAITH_MAX_HP,
	xeroc: XEROC_MAX_HP,
};
export const ENEMY_ATTACK_DAMAGE: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ATTACK_DAMAGE,
	bat: BAT_ATTACK_DAMAGE,
	thief: THIEF_ATTACK_DAMAGE,
	nymph: NYMPH_ATTACK_DAMAGE,
	aquator: AQUATOR_ATTACK_DAMAGE,
	orc: ORC_ATTACK_DAMAGE,
	dragon: DRAGON_ATTACK_DAMAGE,
	yeti: YETI_ATTACK_DAMAGE,
	snake: SNAKE_ATTACK_DAMAGE,
	vampire: VAMPIRE_ATTACK_DAMAGE,
	rat: RAT_ATTACK_DAMAGE,
	emu: EMU_ATTACK_DAMAGE,
	kestrel: KESTREL_ATTACK_DAMAGE,
	hobgoblin: HOBGOBLIN_ATTACK_DAMAGE,
	centaur: CENTAUR_ATTACK_DAMAGE,
	quagga: QUAGGA_ATTACK_DAMAGE,
	"ur-vile": UR_VILE_ATTACK_DAMAGE,
	jabberwock: JABBERWOCK_ATTACK_DAMAGE,
	griffin: GRIFFIN_ATTACK_DAMAGE,
	troll: TROLL_ATTACK_DAMAGE,
	"icky-thing": ICKY_THING_ATTACK_DAMAGE,
	"venus-flytrap": VENUS_FLYTRAP_ATTACK_DAMAGE,
	medusa: MEDUSA_ATTACK_DAMAGE,
	phantom: PHANTOM_ATTACK_DAMAGE,
	wraith: WRAITH_ATTACK_DAMAGE,
	xeroc: XEROC_ATTACK_DAMAGE,
};
/**
 * How many times this kind acts per player turn. A closure-based Scheduler
 * (src/scheduler/) can't live inside a serializable GameState, so speed
 * differences are plain data instead — see docs/tasks/game-history.md milestone 9.
 */
export const ENEMY_ACTIONS_PER_TURN: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ACTIONS_PER_TURN,
	bat: BAT_ACTIONS_PER_TURN,
	thief: THIEF_ACTIONS_PER_TURN,
	nymph: NYMPH_ACTIONS_PER_TURN,
	aquator: AQUATOR_ACTIONS_PER_TURN,
	orc: ORC_ACTIONS_PER_TURN,
	dragon: DRAGON_ACTIONS_PER_TURN,
	yeti: YETI_ACTIONS_PER_TURN,
	snake: SNAKE_ACTIONS_PER_TURN,
	vampire: VAMPIRE_ACTIONS_PER_TURN,
	rat: RAT_ACTIONS_PER_TURN,
	emu: EMU_ACTIONS_PER_TURN,
	kestrel: KESTREL_ACTIONS_PER_TURN,
	hobgoblin: HOBGOBLIN_ACTIONS_PER_TURN,
	centaur: CENTAUR_ACTIONS_PER_TURN,
	quagga: QUAGGA_ACTIONS_PER_TURN,
	"ur-vile": UR_VILE_ACTIONS_PER_TURN,
	jabberwock: JABBERWOCK_ACTIONS_PER_TURN,
	griffin: GRIFFIN_ACTIONS_PER_TURN,
	troll: TROLL_ACTIONS_PER_TURN,
	"icky-thing": ICKY_THING_ACTIONS_PER_TURN,
	"venus-flytrap": VENUS_FLYTRAP_ACTIONS_PER_TURN,
	medusa: MEDUSA_ACTIONS_PER_TURN,
	phantom: PHANTOM_ACTIONS_PER_TURN,
	wraith: WRAITH_ACTIONS_PER_TURN,
	xeroc: XEROC_ACTIONS_PER_TURN,
};
/** Experience awarded for defeating each kind — see applyExperienceGain. Roughly tracks ENEMY_MAX_HP. */
export const ENEMY_EXPERIENCE_REWARD: Readonly<Record<EnemyKind, number>> = {
	zombie: 2,
	bat: 1,
	thief: 2,
	nymph: 1,
	aquator: 3,
	orc: 3,
	dragon: 6,
	yeti: 4,
	snake: 3,
	vampire: 5,
	rat: 1,
	emu: 2,
	kestrel: 2,
	hobgoblin: 3,
	centaur: 3,
	quagga: 4,
	"ur-vile": 4,
	jabberwock: 6,
	griffin: 7,
	troll: 6,
	"icky-thing": 1,
	"venus-flytrap": 3,
	medusa: 5,
	phantom: 4,
	wraith: 5,
	xeroc: 4,
};

/** Max HP gained each time the player levels up — see applyExperienceGain. */
export const PLAYER_LEVEL_UP_HP_BONUS = 3;
/**
 * Cumulative experience needed to reach level 2, 3, ... 10 (index 0 = level
 * 2's threshold), roughly doubling each step like original Rogue. Level 10
 * is the cap — no further growth once playerExperience exceeds the last entry.
 */
export const LEVEL_EXPERIENCE_THRESHOLDS: readonly number[] = [
	10, 20, 40, 80, 160, 320, 640, 1280, 2560,
];

/** How a kind's per-floor spawn count grows with depth: +1 every `growthInterval` floors, capped at `max`. */
export interface EnemyCountScaling {
	readonly base: number;
	readonly growthInterval: number;
	readonly max: number;
}

/** The enemy kinds whose per-floor count scales with depth — thief spawns independently instead (see THIEF_SPAWN_CHANCE_PERCENT). */
type ScaledEnemyKind = "zombie" | "bat";

/** Bats grow faster (every 2 floors vs. every 3) — deeper floors skew towards the faster kind. */
export const ENEMY_COUNT_SCALING: Readonly<
	Record<ScaledEnemyKind, EnemyCountScaling>
> = {
	zombie: { base: ZOMBIE_COUNT_BASE, growthInterval: 3, max: 8 },
	bat: { base: BAT_COUNT_BASE, growthInterval: 2, max: 8 },
};

/** How many of `kind` spawn on the given (1-based) floor. */
export const calculateEnemyCountForFloor = (
	kind: ScaledEnemyKind,
	floor: number,
): number => {
	const scaling = ENEMY_COUNT_SCALING[kind];
	return Math.min(
		scaling.base + Math.floor((floor - 1) / scaling.growthInterval),
		scaling.max,
	);
};

export const POTION_COUNT_PER_FLOOR = 1;
export const POTION_HEAL_AMOUNT = 5;

/** A freshly picked-up sword's own attackBonus (see HeldItem) — raised further by enchant-weapon scrolls targeting it. */
export const SWORD_ATTACK_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a sword spawns. */
export const SWORD_SPAWN_CHANCE_PERCENT = 15;
/**
 * Chance (out of 100) that a sword turns out cursed — rolled once at pickup
 * (see items/pickups.ts) and hidden until equipped. A cursed item is exactly
 * as effective as an uncursed one; the only effect is that it cannot be
 * unequipped until a remove-curse scroll is read (milestone 81 dropped the
 * older "curse subtracts from the stat" design).
 */
export const SWORD_CURSE_CHANCE_PERCENT = 20;

/** A freshly picked-up armor's own defenseBonus (see HeldItem) — raised further by enchant-armor scrolls targeting it. */
export const ARMOR_DEFENSE_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that armor spawns. */
export const ARMOR_SPAWN_CHANCE_PERCENT = 15;
/** Chance (out of 100) that armor turns out cursed — same idiom and timing as SWORD_CURSE_CHANCE_PERCENT. */
export const ARMOR_CURSE_CHANCE_PERCENT = 20;

export const POISON_DAMAGE = 4;
/** Chance (out of 100), independently rolled per floor, that a poison potion spawns. */
export const POISON_POTION_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a teleport scroll spawns. */
export const SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a magic mapping scroll spawns. */
export const MAPPING_SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that an identify scroll spawns. */
export const IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Permanent boost to playerPower per strength potion drunk — meaningful even with no sword equipped. */
export const STRENGTH_POTION_ATTACK_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a strength potion spawns. */
export const STRENGTH_POTION_SPAWN_CHANCE_PERCENT = 15;

/**
 * The deepest floor — where the Amulet of Yendor lies. It has no down
 * staircase (nothing lower); reaching it and climbing all the way back to
 * the surface with the amulet is what actually wins the run. See
 * floor.ts's descendStairs/ascendStairs.
 */
export const GOAL_FLOOR = 10;

export const PLAYER_MAX_FOOD = 100;
/**
 * playerFood at or below this triggers the one-time player-hungry warning
 * and turns the status-bar food readout yellow (red is reserved for 0 —
 * see statusBar.tsx). Raised 30→50 (2026-07-18 playtest): with only one
 * stage at 30, the drop from 100 was going unnoticed until it was critical.
 */
export const PLAYER_HUNGER_WARNING_THRESHOLD = 50;
/**
 * playerFood at or below this triggers the one-time player-weak warning and
 * applies WEAK_ATTACK_PENALTY to the player's attack (see
 * calculatePlayerAttackDamage). A second, more urgent stage below
 * PLAYER_HUNGER_WARNING_THRESHOLD, matching original Rogue's
 * Hungry→Weak→Faint progression — the Weak-stage strength loss, modeled here
 * as an attack penalty since this game has no separate strength stat.
 */
export const PLAYER_WEAK_THRESHOLD = 20;
/** Flat reduction to calculatePlayerAttackDamage while playerFood <= PLAYER_WEAK_THRESHOLD. */
export const WEAK_ATTACK_PENALTY = 1;
/** Floor for calculatePlayerAttackDamage — keeps a weakened, unarmed player from dealing 0 damage. */
export const MIN_PLAYER_ATTACK_DAMAGE = 1;
/** HP lost per turn while playerFood is at 0. */
export const STARVATION_DAMAGE_PER_TURN = 1;
export const FOOD_RATION_RESTORE_AMOUNT = 50;
export const FOOD_COUNT_PER_FLOOR = 2;

export const GOLD_PILES_PER_FLOOR = 3;
export const GOLD_AMOUNT_MIN = 2;
export const GOLD_AMOUNT_MAX = 20;

export const TRAP_COUNT_PER_FLOOR = 2;
export const DART_TRAP_DAMAGE = 2;
/** No damage — the penalty is the forced descent itself, see floor.ts's descendStairs. */
export const TRAPDOOR_DAMAGE = 0;
/** Chance (out of 100), independently rolled per floor (never on GOAL_FLOOR), that a trapdoor spawns. */
export const TRAPDOOR_SPAWN_CHANCE_PERCENT = 15;
/** No damage — the penalty is being relocated at random, see teleport.ts's applyRandomTeleport. */
export const TELEPORT_TRAP_DAMAGE = 0;
/**
 * Chance (out of 100), independently rolled per floor, that a teleport trap
 * spawns — same idiom as TRAPDOOR_SPAWN_CHANCE_PERCENT, but (unlike a
 * trapdoor) allowed on GOAL_FLOOR too, since it only relocates the player
 * within the same floor rather than generating one beyond it.
 */
export const TELEPORT_TRAP_SPAWN_CHANCE_PERCENT = 20;

/** No damage — the penalty is the paralysis itself, see PARALYZED_TURNS_REMAINING handling in trapTrigger.ts. */
export const BEAR_TRAP_DAMAGE = 0;
/** How many turns a bear trap paralyzes the player for — same length as the paralysis potion. */
export const BEAR_TRAP_PARALYSIS_DURATION = 3;
/** Chance (out of 100), independently rolled per floor, that a bear trap spawns — same idiom as TRAPDOOR_SPAWN_CHANCE_PERCENT, allowed on GOAL_FLOOR too (it never generates a floor beyond it). */
export const BEAR_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** No damage — the penalty is the armor degradation itself, see trapTrigger.ts's TRAP_SIDE_EFFECTS. */
export const RUST_TRAP_DAMAGE = 0;
/** Chance (out of 100), independently rolled per floor, that a rust trap spawns — same idiom as the other non-guaranteed traps, allowed on GOAL_FLOOR too. */
export const RUST_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** No damage — the penalty is the forced sleep itself, see trapTrigger.ts's TRAP_SIDE_EFFECTS. */
export const SLEEPING_GAS_TRAP_DAMAGE = 0;
/**
 * How many turns a sleeping gas trap holds the player for — reuses
 * paralyzedTurnsRemaining, same field/tick/status-bar chip as a bear trap
 * (see trapTrigger.ts). Longer than BEAR_TRAP_PARALYSIS_DURATION: original
 * Rogue's sleep trap is the more punishing of the two.
 */
export const SLEEPING_GAS_TRAP_PARALYSIS_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a sleeping gas trap spawns — same idiom as the other non-guaranteed traps, allowed on GOAL_FLOOR too. */
export const SLEEPING_GAS_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** Per-kind lookup table, same idiom as ENEMY_MAX_HP — a second kind is one entry. */
export const TRAP_DAMAGE: Readonly<Record<TrapKind, number>> = {
	dart: DART_TRAP_DAMAGE,
	trapdoor: TRAPDOOR_DAMAGE,
	teleport: TELEPORT_TRAP_DAMAGE,
	bear: BEAR_TRAP_DAMAGE,
	rust: RUST_TRAP_DAMAGE,
	"sleeping-gas": SLEEPING_GAS_TRAP_DAMAGE,
};

/** Chance (out of 100), independently rolled per floor, that a ring spawns. */
export const RING_SPAWN_CHANCE_PERCENT = 8;
/** Chance (out of 100) that a ring turns out cursed — same pickup-time-roll, hidden-until-equipped idiom as SWORD_CURSE_CHANCE_PERCENT. */
export const RING_CURSE_CHANCE_PERCENT = 20;
/**
 * Chance (out of 100), rolled independently every turn a ring of
 * regeneration is equipped and playerHp is below PLAYER_MAX_HP, that it
 * heals 1 HP this turn — same "roll every eligible turn, not guaranteed"
 * idiom as WAKE_CHANCE_PERCENT.
 */
export const RING_REGEN_CHANCE_PERCENT = 20;

/** Chance (out of 100), independently rolled per floor, that a ring of sustenance spawns. */
export const SUSTENANCE_RING_SPAWN_CHANCE_PERCENT = 8;
/**
 * Chance (out of 100), rolled independently every turn a ring of sustenance
 * is equipped, that the whole hunger tick (food loss, and any starvation
 * consequences) is skipped this turn — same "roll every eligible turn"
 * idiom as RING_REGEN_CHANCE_PERCENT.
 */
export const SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT = 50;

/** Chance (out of 100), independently rolled per floor, that a ring of stealth spawns. */
export const STEALTH_RING_SPAWN_CHANCE_PERCENT = 8;
/**
 * Replaces WAKE_CHANCE_PERCENT (33) while a ring of stealth is equipped —
 * roughly half, see enemies.ts's advanceEnemies.
 */
export const STEALTH_RING_WAKE_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a ring of awareness spawns. */
export const AWARENESS_RING_SPAWN_CHANCE_PERCENT = 8;

/** Chance (out of 100), independently rolled per floor, that a ring of aggravate monster spawns — the first ring with a downside rather than a benefit. */
export const AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT = 8;

/**
 * Permanent boost to a targeted sword's own attackBonus per scroll read
 * (see items/scrolls.ts — the player picks which held sword, equipped or
 * not; no-op with no sword held). Same magnitude as a freshly found sword,
 * but the scroll itself is never cursed.
 */
export const ENCHANT_WEAPON_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant weapon scroll spawns. */
export const ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/**
 * Permanent boost to a targeted armor's own defenseBonus per scroll read —
 * same targeting and never-cursed rules as ENCHANT_WEAPON_BONUS.
 */
export const ENCHANT_ARMOR_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant armor scroll spawns. */
export const ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/**
 * Fixed ranged damage a wand of striking deals — higher than the player's
 * base melee damage as compensation for never getting a sneak-attack
 * multiplier (see combat.ts's applyWandStrike).
 */
export const WAND_STRIKE_DAMAGE = 3;
/** Chance (out of 100), independently rolled per floor, that a wand spawns. */
export const WAND_SPAWN_CHANCE_PERCENT = 8;

/** Chance (out of 100), independently rolled per floor, that a teleport wand spawns — same rarity as the other wands. */
export const TELEPORT_WAND_SPAWN_CHANCE_PERCENT = 8;

/** Fixed ranged damage a wand of magic missile deals — higher than WAND_STRIKE_DAMAGE, offset by a lower spawn chance. */
export const MAGIC_MISSILE_WAND_DAMAGE = 5;
/** Chance (out of 100), independently rolled per floor, that a magic missile wand spawns — lower than WAND_SPAWN_CHANCE_PERCENT. */
export const MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT = 6;

/** How many turns a confuse monster scroll makes an enemy wander instead of pathfinding toward the player (adjacent attacks still land). */
export const CONFUSE_MONSTER_SCROLL_DURATION = 8;
/** Chance (out of 100), independently rolled per floor, that a confuse monster scroll spawns. */
export const CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** How many turns a hallucination potion swaps displayed enemy glyphs for decoys — purely cosmetic, see frame.ts. */
export const HALLUCINATION_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a hallucination potion spawns. */
export const HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT = 12;

/** How many turns a hold monster scroll freezes every visible enemy for — same length as SLOW_WAND_DURATION, its single-target counterpart. */
export const HOLD_MONSTER_SCROLL_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a hold monster scroll spawns. */
export const HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** Chance (out of 100), independently rolled per floor, that a sleep wand spawns — same rarity as the other wands. */
export const SLEEP_WAND_SPAWN_CHANCE_PERCENT = 8;

/** How many turns a confusion potion randomizes movement for. */
export const CONFUSION_POTION_DURATION = 10;
/** Chance (out of 100), independently rolled per floor, that a confusion potion spawns. */
export const CONFUSION_POTION_SPAWN_CHANCE_PERCENT = 15;

/** How many turns a wand of slow monster freezes its target for. */
export const SLOW_WAND_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a slow wand spawns. */
export const SLOW_WAND_SPAWN_CHANCE_PERCENT = 8;

/** How many turns a levitation potion floats the player over traps for. */
export const LEVITATION_POTION_DURATION = 15;
/** Chance (out of 100), independently rolled per floor, that a levitation potion spawns. */
export const LEVITATION_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Chance (out of 100), independently rolled per floor, that a protect armor scroll spawns. Sets rustProtected on a targeted held armor (see items/scrolls.ts). */
export const PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** Chance (out of 100), independently rolled per floor, that a remove-curse scroll spawns. No-op (not consumed) if nothing currently equipped is cursed. */
export const REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** How many turns a blindness potion shrinks the player's field of view for. */
export const BLIND_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a blindness potion spawns. */
export const BLIND_POTION_SPAWN_CHANCE_PERCENT = 12;
/** Field of view radius while blind — adjacent tiles only. */
export const BLIND_VIEW_RADIUS = 1;

/**
 * How many turns a paralysis potion locks the player out of acting for.
 * Shorter than the other temporary statuses — being unable to act at all
 * for even a few turns next to an enemy is punishing enough.
 */
export const PARALYSIS_POTION_DURATION = 3;
/** Chance (out of 100), independently rolled per floor, that a paralysis potion spawns. */
export const PARALYSIS_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Chance (out of 100), independently rolled per floor, that a potion of raise level spawns — rarer than the other potions since an instant level-up is a strong effect. */
export const RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT = 8;

/** Final-score weights — see calculateScore in score.ts. */
export const SCORE_PER_FLOOR = 100;
export const SCORE_PER_LEVEL = 50;
export const SCORE_AMULET_BONUS = 500;

/** How many turns a detect monster potion reveals every enemy through, regardless of FOV. */
export const DETECT_MONSTER_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a detect monster potion spawns. */
export const DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Permanent playerMaxHp increase from a potion of life — higher than a level-up's bonus, a high-value find. */
export const LIFE_POTION_MAX_HP_BONUS = 5;
/** Chance (out of 100), independently rolled per floor, that a potion of life spawns — rare, like raise-level. */
export const LIFE_POTION_SPAWN_CHANCE_PERCENT = 8;

/** Turns spent on one floor before a winds-of-kron-warning fires — see applyWindsOfKronTick. */
export const WINDS_OF_KRON_WARNING_TURNS = 150;
/** Turns spent on one floor before the player is forcibly evicted to the next floor down. */
export const WINDS_OF_KRON_EVICTION_TURNS = 200;

/** Chance (out of 100), independently rolled per floor, that a monster house room spawns — see buildFloorLayout. */
export const MONSTER_HOUSE_SPAWN_CHANCE_PERCENT = 15;
/** Extra enemies dumped into a monster house room, all pre-awake. */
export const MONSTER_HOUSE_ENEMY_COUNT = 4;

/** Score bonus for finishing a run having never landed an attack — see calculateScore. */
export const SCORE_PACIFIST_BONUS = 300;
/** Score bonus for finishing a run having never eaten — see calculateScore. */
export const SCORE_FOODLESS_BONUS = 300;
