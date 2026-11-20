import type { Enemy, GameState } from "../state.js";
import {
	type EnemyActionResult,
	type EnemyActor,
	type EnemyTurnProgress,
	resolveEnemyAction,
} from "./action.js";
import { canFlyAgain } from "./enemyFlight.js";

/** Whether the enemy's turn is over early — it fled the floor, or the player is dead. */
const isTurnOver = (result: EnemyActionResult): boolean =>
	result.actor.fled || result.progress.died;

/**
 * Every action one awake enemy takes this turn, as original Rogue's
 * runners()/move_monst(): one move — two while `hasted` (every monster from
 * HASTED_ENEMY_FLOOR down) — and a flying kind still away from the player
 * after that gets one whole move more (enemyFlight.ts's canFlyAgain). The
 * turn stops early once the enemy flees or the player dies. See
 * action.ts's resolveEnemyAction for what one action is.
 */
export const resolveEnemyTurnActions = (
	state: GameState,
	enemy: Enemy,
	progress: EnemyTurnProgress,
	hasted: boolean,
	confused: boolean,
	visiblePoints: ReadonlySet<string>,
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	const act = (actor: EnemyActor, current: EnemyTurnProgress) =>
		resolveEnemyAction(
			state,
			enemy,
			actor,
			current,
			confused,
			visiblePoints,
			occupied,
		);
	const move = (actor: EnemyActor, current: EnemyTurnProgress) => {
		const first = act(actor, current);
		return hasted && !isTurnOver(first)
			? act(first.actor, first.progress)
			: first;
	};
	const firstMove = move(
		{ position: enemy, hp: enemy.hp, fled: false },
		progress,
	);
	return !isTurnOver(firstMove) &&
		canFlyAgain(enemy.kind, firstMove.actor.position, state.player)
		? move(firstMove.actor, firstMove.progress)
		: firstMove;
};
