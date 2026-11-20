import { type RngState, stepUniform } from "../../rng.js";
import { isAdjacent } from "../combat.js";
import type { GameEvent } from "../events.js";
import type { Enemy, GameState, HeldItem, Position } from "../state.js";
import { resolveAdjacentAction, withEvents } from "./adjacentAction.js";
import { ERRATIC_MOVE_CHANCE_PERCENT } from "./enemyFlight.js";
import { resolveEnemyMovement, stepWandering } from "./enemyMovement.js";

/**
 * Everything the enemies' turn has changed on the player's side so far,
 * threaded through every enemy's every action (advanceEnemies folds it back
 * into GameState at the end). `died` cuts short all remaining actions.
 */
export interface EnemyTurnProgress {
	readonly rng: RngState;
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerStrength: number;
	readonly playerConfusedTurnsRemaining: number;
	readonly playerParalyzedTurnsRemaining: number;
	readonly flytrapHoldDamage: number;
	/** Some enemy acted against the player this turn (attacked, missed or stole) — ends the quiet natural healing waits for. */
	readonly playerAttacked: boolean;
	readonly goldCollected: number;
	readonly inventory: readonly HeldItem[];
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/** The acting enemy's own running state. `fled` removes it from the floor for good (thief/nymph). */
export interface EnemyActor {
	readonly position: Position;
	readonly hp: number;
	readonly fled: boolean;
}

export interface EnemyActionResult {
	readonly actor: EnemyActor;
	readonly progress: EnemyTurnProgress;
}

/**
 * One action of one awake, unfrozen enemy. A kind listed in
 * ERRATIC_MOVE_CHANCE_PERCENT (bat, phantom) first rolls that chance to
 * flutter one random step instead — even away from a player it stands next
 * to, which is what makes a bat so hard to pin down.
 * Adjacent to the player it acts in place (adjacentAction.ts: an attack,
 * or a kind's own special — stealing, the flytrap's hold, the ice monster's
 * freeze). Otherwise it moves or does its kind's ranged thing
 * (enemyMovement.ts's resolveEnemyMovement). `enemy` is the enemy as it
 * started the turn; `actor` is where it stands and what HP it has now.
 * `occupied` is the other enemies' tiles.
 */
export const resolveEnemyAction = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
	confused: boolean,
	visiblePoints: ReadonlySet<string>,
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	const erraticChancePercent = ERRATIC_MOVE_CHANCE_PERCENT[enemy.kind];
	if (erraticChancePercent === undefined) {
		return resolveIntendedAction(
			state,
			enemy,
			actor,
			progress,
			confused,
			visiblePoints,
			occupied,
		);
	}
	const erraticRoll = stepUniform(progress.rng);
	if (erraticRoll.value >= erraticChancePercent / 100) {
		return resolveIntendedAction(
			state,
			enemy,
			actor,
			{ ...progress, rng: erraticRoll.state },
			confused,
			visiblePoints,
			occupied,
		);
	}
	const fluttered = stepWandering(
		state,
		actor.position,
		occupied,
		erraticRoll.state,
	);
	return {
		actor: { ...actor, position: fluttered.position },
		progress: { ...progress, rng: fluttered.rng },
	};
};

/** What the enemy does when it is not lurching about at random — see resolveEnemyAction. */
const resolveIntendedAction = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
	confused: boolean,
	visiblePoints: ReadonlySet<string>,
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	if (!isAdjacent(actor.position, state.player)) {
		const movement = resolveEnemyMovement(
			state,
			enemy,
			actor.position,
			occupied,
			visiblePoints,
			confused,
			progress.rng,
		);
		return {
			actor: { ...actor, position: movement.position },
			progress: withEvents(
				{
					...progress,
					rng: movement.rng,
					playerConfusedTurnsRemaining:
						movement.playerConfusedTurnsRemaining ??
						progress.playerConfusedTurnsRemaining,
				},
				movement.event === undefined ? [] : [movement.event],
			),
		};
	}
	return resolveAdjacentAction(state, enemy, actor, progress);
};
