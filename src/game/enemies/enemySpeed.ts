import type { Enemy, EnemySpeed, GameState } from "../state.js";
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

/** A slowed monster's t_turn flips on every move, acting or not (original Rogue's move_monst()). */
const toggleSlowedTurn = (speed: EnemySpeed): EnemySpeed => {
	switch (speed) {
		case "slowed-acting":
			return "slowed-resting";
		case "slowed-resting":
			return "slowed-acting";
		case "normal":
		case "hasted":
			return speed;
	}
};

export interface EnemyTurnResult extends EnemyActionResult {
	/** The enemy's speed after this turn — a slowed one alternates (toggleSlowedTurn). */
	readonly speed: EnemySpeed;
}

/**
 * Every action one awake enemy takes this turn, as original Rogue's
 * runners()/move_monst(). One move: no action on a slowed monster's resting
 * move, two while hasted, one otherwise. A flying kind still away from the
 * player after that gets one whole move more (enemyFlight.ts's canFlyAgain)
 * — which for a slowed flier flips its turn back, so it ends up acting
 * every turn while far away, as in the original. The turn stops early
 * once the enemy flees or the player dies. See action.ts's
 * resolveEnemyAction for what one action is.
 */
export const resolveEnemyTurnActions = (
	state: GameState,
	enemy: Enemy,
	progress: EnemyTurnProgress,
	confused: boolean,
	visiblePoints: ReadonlySet<string>,
	occupied: ReadonlySet<string>,
): EnemyTurnResult => {
	const act = (from: EnemyActionResult): EnemyActionResult =>
		resolveEnemyAction(
			state,
			enemy,
			from.actor,
			from.progress,
			confused,
			visiblePoints,
			occupied,
		);
	const move = (from: EnemyTurnResult): EnemyTurnResult => {
		const first = from.speed === "slowed-resting" ? from : act(from);
		const second =
			from.speed === "hasted" && !isTurnOver(first) ? act(first) : first;
		return { ...second, speed: toggleSlowedTurn(from.speed) };
	};
	const start: EnemyActor = { position: enemy, hp: enemy.hp, fled: false };
	const firstMove = move({ actor: start, progress, speed: enemy.speed });
	return !isTurnOver(firstMove) &&
		canFlyAgain(enemy.kind, firstMove.actor.position, state.player)
		? move(firstMove)
		: firstMove;
};
