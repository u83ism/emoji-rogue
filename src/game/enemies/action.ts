import type { RngState } from "../../rng.js";
import { isAdjacent } from "../combat.js";
import type { GameEvent } from "../events.js";
import type { Enemy, GameState, HeldItem, Position } from "../state.js";
import { resolveFleeingTheft } from "./enemyFlee.js";
import { resolveEnemyHitLanded } from "./enemyHitLanded.js";
import { resolveEnemyMovement } from "./enemyMovement.js";

/**
 * Everything the enemies' turn has changed on the player's side so far,
 * threaded through every enemy's every action (advanceEnemies folds it back
 * into GameState at the end). `died` cuts short all remaining actions.
 */
export interface EnemyTurnProgress {
	readonly rng: RngState;
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerConfusedTurnsRemaining: number;
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

const withEvents = (
	progress: EnemyTurnProgress,
	events: readonly GameEvent[],
): EnemyTurnProgress =>
	events.length === 0
		? progress
		: { ...progress, events: [...progress.events, ...events] };

/**
 * One action of one awake, unfrozen enemy. Adjacent to the player it acts in
 * place: thief/nymph steal and flee (enemyFlee.ts), every other kind attacks
 * (enemyHitLanded.ts — to-hit roll, dice damage, the kind's own on-hit
 * effect). Otherwise it moves or does its kind's ranged thing
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
	if (enemy.kind === "thief" || enemy.kind === "nymph") {
		const { event, ...stolen } = resolveFleeingTheft(
			enemy.kind,
			progress.rng,
			progress.goldCollected,
			progress.inventory,
		);
		return {
			actor: { ...actor, fled: true },
			progress: withEvents({ ...progress, ...stolen }, [event]),
		};
	}
	const hit = resolveEnemyHitLanded(
		enemy,
		actor.hp,
		progress.playerHp,
		progress.playerMaxHp,
		progress.inventory,
		progress.rng,
	);
	return {
		actor: { ...actor, hp: hit.enemyHp },
		progress: withEvents(
			{
				...progress,
				playerHp: hit.playerHp,
				playerMaxHp: hit.playerMaxHp,
				inventory: hit.inventory,
				rng: hit.rng,
				died: progress.died || hit.died,
			},
			hit.events,
		),
	};
};
