import { createAStarPath } from "../../path/index.js";
import { encodePointKey } from "../../pointkey.js";
import type { RngState } from "../../rng.js";
import { stepUniform } from "../../rng.js";
import { canStepBetween, DIRECTION_VECTORS } from "../directions.js";
import type { Enemy, GameState, Position } from "../state.js";

/** Enemies move like the player: eight directions, floor only, no corner cutting. */
const ENEMY_DIRECTIONS: readonly (readonly [number, number])[] =
	Object.values(DIRECTION_VECTORS);

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
			topology: 8,
			canStep: (fromX, fromY, toX, toY) =>
				canStepBetween(
					state.terrain,
					{ x: fromX, y: fromY },
					{ x: toX, y: toY },
				),
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
 * One random step (or standing still when boxed in) — an unseen enemy's
 * wandering, and a bat's or phantom's erratic flutter (action.ts). It never steps
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
		if (
			isFloor(state.terrain, x, y) &&
			canStepBetween(state.terrain, enemy, { x, y }) &&
			!occupied.has(encodePointKey(x, y))
		) {
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

/** Where a non-adjacent enemy's move takes it, and the rng after — see enemies.ts's advanceEnemies. */
export interface EnemyMovementResult {
	readonly position: Position;
	readonly rng: RngState;
}

/**
 * What a non-adjacent, awake enemy does this action: venus-flytrap is
 * stationary and never moves; any other kind chases via A* while visible,
 * or wanders otherwise (a confused one's stumbles are action.ts's). (A medusa's gaze is not a move of
 * its own — see medusaGaze.ts.)
 */
export const resolveEnemyMovement = (
	state: GameState,
	enemy: Enemy,
	next: Position,
	occupied: ReadonlySet<string>,
	visiblePoints: ReadonlySet<string>,
	rng: RngState,
): EnemyMovementResult => {
	if (enemy.kind === "venus-flytrap") {
		return { position: next, rng };
	}
	if (visiblePoints.has(encodePointKey(next.x, next.y))) {
		const step = stepTowardPlayer(state, next, occupied);
		return { position: step ?? next, rng };
	}
	const wandered = stepWandering(state, next, occupied, rng);
	return { position: wandered.position, rng: wandered.rng };
};
