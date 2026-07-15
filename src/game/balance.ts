// Combat tuning knobs, all in one place. Values are provisional and expected
// to change after real-terminal playtesting (docs/tasks/game.md, milestone 5).
// Damage is a fixed amount — no dice — so combat stays deterministic
// (docs/tasks/game.md milestone 15: a normal-distribution roll was tried and
// rolled back, but the reusable rollDamage() in damage.ts is kept for when
// dice-based damage is wanted again).

import type { EnemyKind } from "./events.js";

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

/**
 * Per-kind lookup tables so `advanceEnemies`/`floor.ts` stay kind-agnostic —
 * adding a third enemy kind means adding one entry here, not a new branch
 * elsewhere.
 */
export const ENEMY_MAX_HP: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_MAX_HP,
	bat: BAT_MAX_HP,
};
export const ENEMY_ATTACK_DAMAGE: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ATTACK_DAMAGE,
	bat: BAT_ATTACK_DAMAGE,
};
/**
 * How many times this kind acts per player turn. A closure-based Scheduler
 * (src/scheduler/) can't live inside a serializable GameState, so speed
 * differences are plain data instead — see docs/tasks/game.md milestone 9.
 */
export const ENEMY_ACTIONS_PER_TURN: Readonly<Record<EnemyKind, number>> = {
	zombie: ZOMBIE_ACTIONS_PER_TURN,
	bat: BAT_ACTIONS_PER_TURN,
};

/** How a kind's per-floor spawn count grows with depth: +1 every `growthInterval` floors, capped at `max`. */
export interface EnemyCountScaling {
	readonly base: number;
	readonly growthInterval: number;
	readonly max: number;
}

/** Bats grow faster (every 2 floors vs. every 3) — deeper floors skew towards the faster kind. */
export const ENEMY_COUNT_SCALING: Readonly<
	Record<EnemyKind, EnemyCountScaling>
> = {
	zombie: { base: ZOMBIE_COUNT_BASE, growthInterval: 3, max: 8 },
	bat: { base: BAT_COUNT_BASE, growthInterval: 2, max: 8 },
};

/** How many of `kind` spawn on the given (1-based) floor. */
export const calculateEnemyCountForFloor = (
	kind: EnemyKind,
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

/** Permanent boost to playerDefense per shield used. Stacks — no cap (see MIN_DAMAGE_TAKEN). */
export const SHIELD_DEFENSE_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a shield spawns. */
export const SHIELD_SPAWN_CHANCE_PERCENT = 30;

/** Reaching this floor ends the run in victory — see floor.ts's descendStairs. */
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
