import { type RngState, stepUniform } from "../../rng.js";
import { isWithinReach } from "../directions.js";
import { resolveDragonFlame } from "../dragonFlame.js";
import type { EnemyName, GameEvent } from "../events.js";
import type { Enemy, GameState, HeldItem, Position } from "../state.js";
import { resolveAdjacentAction } from "./adjacentAction.js";
import { ERRATIC_MOVE_CHANCE_PERCENT } from "./enemyFlight.js";
import {
	resolveEnemyMovement,
	stepChase,
	stepWandering,
} from "./enemyMovement.js";

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
	/** A wraith's drain can take a level — vitalityDrain.ts. */
	readonly playerLevel: number;
	readonly playerExperience: number;
	readonly playerConfusedTurnsRemaining: number;
	/** GameState.playerRunFlag — an ice monster's freeze clears it mid-turn, so later attackers get the bonus. */
	readonly playerRunFlag: boolean;
	readonly playerParalyzedTurnsRemaining: number;
	readonly flytrapHoldDamage: number;
	/** Some enemy acted against the player this turn (attacked, missed or stole) — ends the quiet natural healing waits for. */
	readonly playerAttacked: boolean;
	readonly goldCollected: number;
	readonly inventory: readonly HeldItem[];
	readonly events: readonly GameEvent[];
	readonly died: boolean;
	/** Monsters a dragon's bounced flame struck (dragonFlame.ts), dealt to after every monster has moved — the hit counts as the player's (enemies.ts). */
	readonly flameStrikes: readonly FlameStrike[];
}

/** One monster a flame struck, as it stood when the turn began. */
export interface FlameStrike {
	readonly target: Enemy;
	readonly name: EnemyName;
	readonly damage: number;
}

/** The acting enemy's own running state. `fled` removes it from the floor for good (thief/nymph). */
export interface EnemyActor {
	readonly position: Position;
	readonly hp: number;
	readonly fled: boolean;
	/** Enemy.confused as it stands now — a stumble may clear it mid-turn. */
	readonly confused: boolean;
}

export interface EnemyActionResult {
	readonly actor: EnemyActor;
	readonly progress: EnemyTurnProgress;
}

/**
 * One action of one awake, unfrozen enemy. A confused one (original
 * Rogue's chase() with ISHUH) stumbles one random step four times in five,
 * and each stumble has a one-in-twenty chance to clear its confusion. A kind listed in
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
	turnProgress: EnemyTurnProgress,
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	let progress = turnProgress;
	if (actor.confused) {
		const stagger = stepUniform(progress.rng);
		if (Math.floor(stagger.value * 5) !== 0) {
			const stumbled = stepWandering(
				state,
				actor.position,
				occupied,
				stagger.state,
			);
			const recovery = stepUniform(stumbled.rng);
			return {
				actor: {
					...actor,
					position: stumbled.position,
					confused: Math.floor(recovery.value * 20) !== 0,
				},
				progress: { ...progress, rng: recovery.state },
			};
		}
		progress = { ...progress, rng: stagger.state };
	}
	const erraticChancePercent = ERRATIC_MOVE_CHANCE_PERCENT[enemy.kind];
	if (erraticChancePercent === undefined) {
		return resolveIntendedAction(state, enemy, actor, progress, occupied);
	}
	const erraticRoll = stepUniform(progress.rng);
	if (erraticRoll.value >= erraticChancePercent / 100) {
		return resolveIntendedAction(
			state,
			enemy,
			actor,
			{ ...progress, rng: erraticRoll.state },
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
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	const goal = enemy.goal;
	if (goal !== undefined) {
		/* original Rogue's do_chase() toward t_dest: no attack on the way */
		const atGoal = actor.position.x === goal.x && actor.position.y === goal.y;
		if (atGoal) {
			return { actor, progress };
		}
		const step = stepChase(state, actor.position, occupied, progress.rng, goal);
		return {
			actor: { ...actor, position: step.position },
			progress: { ...progress, rng: step.rng },
		};
	}
	if (enemy.kind === "dragon" && !enemy.cancelled) {
		const flame = resolveDragonFlame(state, actor.position, progress);
		if (flame.breathed) {
			return { actor, progress: flame.progress };
		}
		return resolveChaseOrBite(state, enemy, actor, flame.progress, occupied);
	}
	return resolveChaseOrBite(state, enemy, actor, progress, occupied);
};

/** Chase the player while out of reach, else act next to them. */
const resolveChaseOrBite = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
	occupied: ReadonlySet<string>,
): EnemyActionResult => {
	if (!isWithinReach(state.terrain, actor.position, state.player)) {
		const movement = resolveEnemyMovement(
			state,
			enemy,
			actor.position,
			occupied,
			progress.rng,
		);
		return {
			actor: { ...actor, position: movement.position },
			progress: { ...progress, rng: movement.rng },
		};
	}
	return resolveAdjacentAction(state, enemy, actor, progress);
};
