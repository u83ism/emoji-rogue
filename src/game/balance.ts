// Combat tuning knobs, all in one place. Values are provisional and expected
// to change after real-terminal playtesting (docs/tasks/game.md, milestone 5).
// Damage is a fixed amount — no dice — so combat stays deterministic; adding
// an rng-driven damage range is a backlog item.

import type { EnemyKind } from "./events.js";

export const PLAYER_MAX_HP = 10;
export const PLAYER_ATTACK_DAMAGE = 1;

export const ZOMBIE_MAX_HP = 2;
export const ZOMBIE_ATTACK_DAMAGE = 1;
export const ZOMBIE_ACTIONS_PER_TURN = 1;
export const ZOMBIE_COUNT_PER_FLOOR = 3;

// A glass cannon: one hit kills it, but it acts twice per player turn, so
// standing next to one costs as much HP as standing next to two zombies.
export const BAT_MAX_HP = 1;
export const BAT_ATTACK_DAMAGE = 1;
export const BAT_ACTIONS_PER_TURN = 2;
export const BAT_COUNT_PER_FLOOR = 2;

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

export const POTION_COUNT_PER_FLOOR = 2;
export const POTION_HEAL_AMOUNT = 5;
