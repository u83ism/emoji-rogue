import { encodePointKey } from "../../pointkey.js";
import type { RngState } from "../../rng.js";
import { stepUniform } from "../../rng.js";
import { canStepBetween, DIRECTION_VECTORS } from "../directions.js";
import {
	buildPassageMap,
	findArea,
	findAreaExits,
	isSameArea,
} from "../floor/passages.js";
import type { Enemy, GameState, Position } from "../state.js";

/** Enemies move like the player: eight directions, floor only, no corner cutting. */
const ENEMY_DIRECTIONS: readonly (readonly [number, number])[] =
	Object.values(DIRECTION_VECTORS);

const isFloor = (
	terrain: GameState["terrain"],
	x: number,
	y: number,
): boolean => terrain[x]?.[y] === 0;

/** Whether a scare monster scroll lies at (x, y) — no monster steps there (original Rogue's chase()/rndmove()). */
export const isScareTile = (state: GameState, x: number, y: number): boolean =>
	state.items.some(
		(item) =>
			item.kind === "scare-monster-scroll" && item.x === x && item.y === y,
	);

const distanceSquared = (left: Position, right: Position): number =>
	(left.x - right.x) ** 2 + (left.y - right.y) ** 2;

/**
 * Where a chase heads this step, as original Rogue's do_chase(): straight
 * for `destination` when it is in the chaser's own room or corridor, else
 * for the doorway out of it nearest the destination — and a chaser standing
 * in a doorway weighs the corridor beyond too (heading straight on when the
 * destination is in that corridor).
 */
const resolveChaseTarget = (
	state: GameState,
	from: Position,
	destination: Position,
): Position => {
	const passages = buildPassageMap(state);
	const destinationArea = findArea(state, passages, destination);
	const area = findArea(state, passages, from);
	if (area === undefined || isSameArea(area, destinationArea)) {
		return destination;
	}
	const candidates = [...findAreaExits(state, passages, area)];
	const corridor = ENEMY_DIRECTIONS.filter(
		([deltaX, deltaY]) => deltaX === 0 || deltaY === 0,
	)
		.map(([deltaX, deltaY]) =>
			passages.passageAt.get(encodePointKey(from.x + deltaX, from.y + deltaY)),
		)
		.find((id) => id !== undefined);
	if (area.kind === "room" && corridor !== undefined) {
		const beyond = { kind: "passage", id: corridor } as const;
		if (isSameArea(beyond, destinationArea)) {
			return destination;
		}
		candidates.push(...findAreaExits(state, passages, beyond));
	}
	let best: Position | undefined;
	for (const exit of candidates) {
		if (
			best === undefined ||
			distanceSquared(exit, destination) < distanceSquared(best, destination)
		) {
			best = exit;
		}
	}
	return best ?? destination;
};

/**
 * One chasing step, as original Rogue's chase(): of the tiles around (no
 * corner cutting, no wall, no other monster, never the player's own), the
 * one nearest the target (resolveChaseTarget) — staying put unless one is
 * no farther than where it stands, ties going at random (one rng step per
 * tie). `destination` is the player unless the monster heads for an item.
 */
export const stepChase = (
	state: GameState,
	from: Position,
	occupied: ReadonlySet<string>,
	rng: RngState,
	destination: Position = state.player,
): EnemyMovementResult => {
	const target = resolveChaseTarget(state, from, destination);
	let best = from;
	let bestDistance = distanceSquared(from, target);
	let ties = 1;
	let current = rng;
	for (let deltaX = -1; deltaX <= 1; deltaX++) {
		for (let deltaY = -1; deltaY <= 1; deltaY++) {
			const tile = { x: from.x + deltaX, y: from.y + deltaY };
			const blocked =
				(deltaX === 0 && deltaY === 0) ||
				!isFloor(state.terrain, tile.x, tile.y) ||
				!canStepBetween(state.terrain, from, tile) ||
				occupied.has(encodePointKey(tile.x, tile.y)) ||
				isScareTile(state, tile.x, tile.y) ||
				(tile.x === state.player.x && tile.y === state.player.y);
			if (blocked) {
				continue;
			}
			const distance = distanceSquared(tile, target);
			if (distance < bestDistance) {
				best = tile;
				bestDistance = distance;
				ties = 1;
			} else if (distance === bestDistance) {
				ties++;
				const roll = stepUniform(current);
				current = roll.state;
				if (Math.floor(roll.value * ties) === 0) {
					best = tile;
				}
			}
		}
	}
	return { position: best, rng: current };
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
			!occupied.has(encodePointKey(x, y)) &&
			!isScareTile(state, x, y)
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
 * stationary and never moves; any other kind chases the player
 * (stepChase), seen or not — an awake monster in original Rogue always knows
 * where the player is. A confused one's stumbles are action.ts's, and a
 * medusa's gaze is not a move of its own (medusaGaze.ts).
 */
export const resolveEnemyMovement = (
	state: GameState,
	enemy: Enemy,
	next: Position,
	occupied: ReadonlySet<string>,
	rng: RngState,
): EnemyMovementResult =>
	enemy.kind === "venus-flytrap"
		? { position: next, rng }
		: stepChase(state, next, occupied, rng);
