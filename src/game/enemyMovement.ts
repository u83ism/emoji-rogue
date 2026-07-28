import { createAStarPath } from "../path/index.js";
import { encodePointKey } from "../pointkey.js";
import type { RngState } from "../rng.js";
import { stepUniform } from "../rng.js";
import {
	MEDUSA_GAZE_CHANCE_PERCENT,
	MEDUSA_GAZE_CONFUSE_DURATION,
} from "./balance.js";
import type { GameEvent } from "./events.js";
import type { Enemy, GameState, Position } from "./state.js";

/** Enemies move like the player: 4 directions, floor only. */
const ENEMY_DIRECTIONS: readonly (readonly [number, number])[] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
];

const isFloor = (
	terrain: GameState["terrain"],
	x: number,
	y: number,
): boolean => terrain[x]?.[y] === 0;

/**
 * The next step along the A* path towards the player, or undefined when no
 * useful step exists. Tries an ally-aware route first; when allies block the
 * only route (single-width corridors), falls back to the ally-blind path and
 * queues up behind them if its first step is free.
 * Deterministic: chasing consumes no randomness.
 */
export const stepTowardPlayer = (
	state: GameState,
	enemy: Position,
	occupied: ReadonlySet<string>,
): Position | undefined => {
	const computeFirstStep = (avoidAllies: boolean): Position | undefined => {
		const passable = (x: number, y: number): boolean => {
			if (x === state.player.x && y === state.player.y) {
				return true; /* the goal itself */
			}
			if (!isFloor(state.terrain, x, y)) {
				return false;
			}
			return avoidAllies ? !occupied.has(encodePointKey(x, y)) : true;
		};
		const findPath = createAStarPath(state.player.x, state.player.y, passable, {
			topology: 4,
		});

		const points: Position[] = [];
		const result = findPath(enemy.x, enemy.y, (x, y) => {
			points.push({ x, y });
		});
		return result.ok ? points[1] : undefined; /* [0] is the enemy itself */
	};

	const routed = computeFirstStep(true);
	if (routed !== undefined) {
		return routed;
	}
	const queued = computeFirstStep(false);
	if (
		queued !== undefined &&
		!occupied.has(encodePointKey(queued.x, queued.y))
	) {
		return queued;
	}
	return undefined;
};

export interface WanderStep {
	readonly position: Position;
	readonly rng: RngState;
}

/**
 * One random step (or standing still when boxed in). Wandering never steps
 * onto the player's tile — off-screen enemies do not kill.
 */
export const stepWandering = (
	state: GameState,
	enemy: Position,
	occupied: ReadonlySet<string>,
	rng: RngState,
): WanderStep => {
	const options: Position[] = [];
	for (const [deltaX, deltaY] of ENEMY_DIRECTIONS) {
		const x = enemy.x + deltaX;
		const y = enemy.y + deltaY;
		if (x === state.player.x && y === state.player.y) {
			continue;
		}
		if (isFloor(state.terrain, x, y) && !occupied.has(encodePointKey(x, y))) {
			options.push({ x, y });
		}
	}
	if (options.length === 0) {
		return { position: enemy, rng };
	}

	const step = stepUniform(rng);
	const picked = options[Math.floor(step.value * options.length)];
	return { position: picked ?? enemy, rng: step.state };
};

/** What a non-adjacent enemy's turn changes beyond its own position — see enemies.ts's advanceEnemies. */
export interface EnemyMovementResult {
	readonly position: Position;
	readonly rng: RngState;
	/** Set only when a medusa's gaze lands — the new value for the player's own confusedTurnsRemaining. */
	readonly playerConfusedTurnsRemaining?: number;
	readonly event?: GameEvent;
}

/**
 * What a non-adjacent, awake enemy does this action: venus-flytrap is
 * stationary and never moves; medusa gazes instead of chasing while visible
 * and not confused (MEDUSA_GAZE_CHANCE_PERCENT to confuse the player at
 * range — see player-gazed); any other kind chases via A* while visible and
 * not confused (icky-thing excluded — it is blind and never chases), or
 * wanders otherwise.
 */
export const resolveEnemyMovement = (
	state: GameState,
	enemy: Enemy,
	next: Position,
	occupied: ReadonlySet<string>,
	visiblePoints: ReadonlySet<string>,
	confused: boolean,
	rng: RngState,
): EnemyMovementResult => {
	if (enemy.kind === "venus-flytrap") {
		return { position: next, rng };
	}
	if (
		enemy.kind === "medusa" &&
		!confused &&
		visiblePoints.has(encodePointKey(next.x, next.y))
	) {
		const gazeRoll = stepUniform(rng);
		if (gazeRoll.value < MEDUSA_GAZE_CHANCE_PERCENT / 100) {
			return {
				position: next,
				rng: gazeRoll.state,
				playerConfusedTurnsRemaining: MEDUSA_GAZE_CONFUSE_DURATION,
				event: {
					type: "player-gazed",
					payload: { turns: MEDUSA_GAZE_CONFUSE_DURATION },
				},
			};
		}
		return { position: next, rng: gazeRoll.state };
	}
	if (
		!confused &&
		enemy.kind !== "icky-thing" &&
		visiblePoints.has(encodePointKey(next.x, next.y))
	) {
		const step = stepTowardPlayer(state, next, occupied);
		return { position: step ?? next, rng };
	}
	const wandered = stepWandering(state, next, occupied, rng);
	return { position: wandered.position, rng: wandered.rng };
};
