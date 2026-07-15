// Combat tuning knobs, all in one place. Values are provisional and expected
// to change after real-terminal playtesting (docs/tasks/game.md, milestone 5).
// Damage is a fixed amount — no dice — so combat stays deterministic
// (docs/tasks/game.md milestone 15: a normal-distribution roll was tried and
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
// per-floor roll like sword/shield.
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
};
export const ENEMY_ATTACK_DAMAGE: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ATTACK_DAMAGE,
	bat: BAT_ATTACK_DAMAGE,
	thief: THIEF_ATTACK_DAMAGE,
	nymph: NYMPH_ATTACK_DAMAGE,
	aquator: AQUATOR_ATTACK_DAMAGE,
};
/**
 * How many times this kind acts per player turn. A closure-based Scheduler
 * (src/scheduler/) can't live inside a serializable GameState, so speed
 * differences are plain data instead — see docs/tasks/game.md milestone 9.
 */
export const ENEMY_ACTIONS_PER_TURN: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ACTIONS_PER_TURN,
	bat: BAT_ACTIONS_PER_TURN,
	thief: THIEF_ACTIONS_PER_TURN,
	nymph: NYMPH_ACTIONS_PER_TURN,
	aquator: AQUATOR_ACTIONS_PER_TURN,
};

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

export const POTION_COUNT_PER_FLOOR = 2;
export const POTION_HEAL_AMOUNT = 5;

/** Permanent boost to playerAttackDamage per sword used. Stacks — no cap. */
export const SWORD_ATTACK_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a sword spawns. */
export const SWORD_SPAWN_CHANCE_PERCENT = 30;
/**
 * Chance (out of 100) that a sword turns out cursed the moment it's used —
 * rolled fresh at use time, not at spawn (see docs/tasks/game.md milestone
 * 29: inventory stacks lose per-item identity, so there is nowhere to pin a
 * curse flag onto a specific sword ahead of time).
 */
export const SWORD_CURSE_CHANCE_PERCENT = 20;
/** However cursed a sword, playerAttackDamage never drops below this. */
export const MIN_PLAYER_ATTACK_DAMAGE = 1;

/** Permanent boost to playerDefense per shield used. Stacks — no cap (see MIN_DAMAGE_TAKEN). */
export const SHIELD_DEFENSE_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a shield spawns. */
export const SHIELD_SPAWN_CHANCE_PERCENT = 30;
/** Chance (out of 100) that a shield turns out cursed the moment it's used — same idiom as SWORD_CURSE_CHANCE_PERCENT. */
export const SHIELD_CURSE_CHANCE_PERCENT = 20;

export const POISON_DAMAGE = 4;
/** Chance (out of 100), independently rolled per floor, that a poison potion spawns. */
export const POISON_POTION_SPAWN_CHANCE_PERCENT = 30;

/** Chance (out of 100), independently rolled per floor, that a teleport scroll spawns. */
export const SCROLL_SPAWN_CHANCE_PERCENT = 30;

/** Chance (out of 100), independently rolled per floor, that a magic mapping scroll spawns. */
export const MAPPING_SCROLL_SPAWN_CHANCE_PERCENT = 30;

/** Chance (out of 100), independently rolled per floor, that an identify scroll spawns. */
export const IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT = 30;

/** Permanent boost to playerAttackDamage per strength potion drunk. Same magnitude as a sword. */
export const STRENGTH_POTION_ATTACK_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a strength potion spawns. */
export const STRENGTH_POTION_SPAWN_CHANCE_PERCENT = 30;

/**
 * The deepest floor — where the Amulet of Yendor lies. It has no down
 * staircase (nothing lower); reaching it and climbing all the way back to
 * the surface with the amulet is what actually wins the run. See
 * floor.ts's descendStairs/ascendStairs.
 */
export const GOAL_FLOOR = 10;

export const PLAYER_MAX_FOOD = 100;
/** playerFood at or below this triggers a one-time player-hungry warning. */
export const PLAYER_HUNGER_WARNING_THRESHOLD = 30;
/** HP lost per turn while playerFood is at 0. */
export const STARVATION_DAMAGE_PER_TURN = 1;
export const FOOD_RATION_RESTORE_AMOUNT = 50;
export const FOOD_COUNT_PER_FLOOR = 1;

export const GOLD_PILES_PER_FLOOR = 3;
export const GOLD_AMOUNT_MIN = 2;
export const GOLD_AMOUNT_MAX = 20;

export const TRAP_COUNT_PER_FLOOR = 2;
export const DART_TRAP_DAMAGE = 2;
/** No damage — the penalty is the forced descent itself, see floor.ts's descendStairs. */
export const TRAPDOOR_DAMAGE = 0;
/** Chance (out of 100), independently rolled per floor (never on GOAL_FLOOR), that a trapdoor spawns. */
export const TRAPDOOR_SPAWN_CHANCE_PERCENT = 15;

/** Per-kind lookup table, same idiom as ENEMY_MAX_HP — a second kind is one entry. */
export const TRAP_DAMAGE: Readonly<Record<TrapKind, number>> = {
	dart: DART_TRAP_DAMAGE,
	trapdoor: TRAPDOOR_DAMAGE,
};

/** Chance (out of 100), independently rolled per floor, that a ring spawns. */
export const RING_SPAWN_CHANCE_PERCENT = 15;
/**
 * Chance (out of 100), rolled independently every turn a ring of
 * regeneration is equipped and playerHp is below PLAYER_MAX_HP, that it
 * heals 1 HP this turn — same "roll every eligible turn, not guaranteed"
 * idiom as WAKE_CHANCE_PERCENT.
 */
export const RING_REGEN_CHANCE_PERCENT = 20;

/** Chance (out of 100), independently rolled per floor, that a ring of sustenance spawns. */
export const SUSTENANCE_RING_SPAWN_CHANCE_PERCENT = 15;
/**
 * Chance (out of 100), rolled independently every turn a ring of sustenance
 * is equipped, that the whole hunger tick (food loss, and any starvation
 * consequences) is skipped this turn — same "roll every eligible turn"
 * idiom as RING_REGEN_CHANCE_PERCENT.
 */
export const SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT = 50;

/**
 * Permanent boost to playerAttackDamage per scroll read — same magnitude as
 * a sword, but unlike a found sword this is never cursed (scrolls have no
 * curse mechanic in this game, see docs/tasks/game.md milestone 36).
 */
export const ENCHANT_WEAPON_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant weapon scroll spawns. */
export const ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT = 20;

/**
 * Permanent boost to playerDefense per scroll read — same magnitude as a
 * shield, but (like enchant-weapon) never cursed.
 */
export const ENCHANT_ARMOR_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant armor scroll spawns. */
export const ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 20;

/**
 * Fixed ranged damage a wand of striking deals — higher than the player's
 * base melee damage as compensation for never getting a sneak-attack
 * multiplier (see combat.ts's applyWandStrike).
 */
export const WAND_STRIKE_DAMAGE = 3;
/** Chance (out of 100), independently rolled per floor, that a wand spawns. */
export const WAND_SPAWN_CHANCE_PERCENT = 15;

/** How many turns a confusion potion randomizes movement for. */
export const CONFUSION_POTION_DURATION = 10;
/** Chance (out of 100), independently rolled per floor, that a confusion potion spawns. */
export const CONFUSION_POTION_SPAWN_CHANCE_PERCENT = 30;

/** How many turns a wand of slow monster freezes its target for. */
export const SLOW_WAND_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a slow wand spawns. */
export const SLOW_WAND_SPAWN_CHANCE_PERCENT = 15;

/** How many turns a levitation potion floats the player over traps for. */
export const LEVITATION_POTION_DURATION = 15;
/** Chance (out of 100), independently rolled per floor, that a levitation potion spawns. */
export const LEVITATION_POTION_SPAWN_CHANCE_PERCENT = 25;

/** Chance (out of 100), independently rolled per floor, that a protect armor scroll spawns. */
export const PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 20;

/** How many turns a blindness potion shrinks the player's field of view for. */
export const BLIND_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a blindness potion spawns. */
export const BLIND_POTION_SPAWN_CHANCE_PERCENT = 25;
/** Field of view radius while blind — adjacent tiles only. */
export const BLIND_VIEW_RADIUS = 1;
