import { type RngState, stepUniform } from "../../rng.js";
import { isAdjacent } from "../combat.js";
import type { GameEvent } from "../events.js";
import { calculateEnemyHitChancePercent } from "../items/hitChance.js";
import type { Enemy, GameState, HeldItem, Position } from "../state.js";
import { resolveEnemyAttack } from "./enemyAttack.js";
import { resolveFleeingTheft } from "./enemyFlee.js";
import { ERRATIC_MOVE_CHANCE_PERCENT } from "./enemyFlight.js";
import { resolveEnemyMovement, stepWandering } from "./enemyMovement.js";
import { resolveFlytrapAttack } from "./flytrapHold.js";

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
	readonly flytrapHoldDamage: number;
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
 * One action of one awake, unfrozen enemy. A kind listed in
 * ERRATIC_MOVE_CHANCE_PERCENT (bat, phantom) first rolls that chance to
 * flutter one random step instead — even away from a player it stands next
 * to, which is what makes a bat so hard to pin down.
 * Adjacent to the player it acts in
 * place: thief/nymph steal and flee (enemyFlee.ts), a venus-flytrap
 * tightens its hold (flytrapHold.ts), every other kind attacks
 * (enemyAttack.ts — a to-hit and damage roll per attack die, the kind's own
 * on-hit effect). Otherwise it moves or does its kind's ranged thing
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
	if (enemy.kind === "thief" || enemy.kind === "nymph") {
		const { event, ...stolen } = resolveFleeingTheft(
			enemy.kind,
			progress.rng,
			progress.goldCollected,
			progress.inventory,
			state.playerLevel,
			state.floor,
		);
		return {
			actor: { ...actor, fled: true },
			progress: withEvents({ ...progress, ...stolen }, [event]),
		};
	}
	if (enemy.kind === "venus-flytrap") {
		const { events, ...squeezed } = resolveFlytrapAttack(
			progress.flytrapHoldDamage,
			progress.playerHp,
			calculateEnemyHitChancePercent(enemy.kind, progress.inventory),
			progress.rng,
		);
		return {
			actor,
			progress: withEvents(
				{ ...progress, ...squeezed, died: progress.died || squeezed.died },
				events,
			),
		};
	}
	const hit = resolveEnemyAttack(
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
