import type { GameState, Position } from "../game/state.js";
import { getNeighbors, getPathDirs } from "../path/path.js";
import { decodePointKey, encodePointKey } from "../pointkey.js";

/** What the BFS found: the matching tile itself, and the first step to reach it from the search origin. */
export interface ReachableTarget {
	readonly x: number;
	readonly y: number;
	readonly nextStep: Position;
}

const isFloorTile = (
	terrain: GameState["terrain"],
	x: number,
	y: number,
): boolean => terrain[x]?.[y] === 0;

/**
 * Breadth-first search from `start` over floor tiles only (walls block;
 * enemy-occupied tiles do not — stepping onto one is a valid bump attack,
 * which the bot's movement policy treats as an ordinary path step). Returns
 * the nearest tile satisfying `isTarget` together with the first step from
 * `start` toward it, or undefined when no matching tile is reachable.
 *
 * Reused for two different questions by varying the predicate: "what is the
 * nearest interesting tile" (many candidates) and "how do I get to this one
 * fixed tile" (single candidate) — both are the same search.
 */
export const findNearestReachableTarget = (
	terrain: GameState["terrain"],
	start: Position,
	isTarget: (x: number, y: number) => boolean,
): ReachableTarget | undefined => {
	const directionVectors = getPathDirs(4);
	const passable = (x: number, y: number): boolean =>
		isFloorTile(terrain, x, y);

	const startKey = encodePointKey(start.x, start.y);
	const parentByKey = new Map<string, string>();
	const visited = new Set<string>([startKey]);
	const queue: Position[] = [start];

	for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
		const current = queue[queueIndex];
		if (current === undefined) {
			throw new Error("unreachable: queueIndex is always within bounds");
		}

		const isStart = current.x === start.x && current.y === start.y;
		if (!isStart && isTarget(current.x, current.y)) {
			let stepKey = encodePointKey(current.x, current.y);
			let previousKey = parentByKey.get(stepKey);
			while (previousKey !== undefined && previousKey !== startKey) {
				stepKey = previousKey;
				previousKey = parentByKey.get(stepKey);
			}
			const [stepX, stepY] = decodePointKey(stepKey);
			return { x: current.x, y: current.y, nextStep: { x: stepX, y: stepY } };
		}

		for (const [neighborX, neighborY] of getNeighbors(
			directionVectors,
			passable,
			current.x,
			current.y,
		)) {
			const neighborKey = encodePointKey(neighborX, neighborY);
			if (visited.has(neighborKey)) {
				continue;
			}
			visited.add(neighborKey);
			parentByKey.set(neighborKey, encodePointKey(current.x, current.y));
			queue.push({ x: neighborX, y: neighborY });
		}
	}

	return undefined;
};
