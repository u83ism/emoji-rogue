import { createAStarPath } from "../path/index.js";
import { encodePointKey } from "../pointkey.js";
import type { RngState } from "../rng.js";
import { stepUniform } from "../rng.js";
import type { GameState, Position } from "./state.js";

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
