import { DIRS } from "../constants.js";
import { toXy } from "../indexing.js";
import type { Result } from "../result.js";

export type ComputeCallback = (x: number, y: number) => void;
export type PassableCallback = (x: number, y: number) => boolean;

export interface PathOptions {
	topology: 4 | 6 | 8;
}

/** No path exists between the two points, given the current passability. */
export type NoPathFound = "no-path-found";

/**
 * Computes a path from (fromX, fromY) towards a target fixed at creation
 * time, invoking `callback` for each point along the way. Returns a Result
 * so callers can distinguish "no path exists" (an expected, normal-path
 * outcome) from a path that was found.
 */
export type Path = (
	fromX: number,
	fromY: number,
	callback: ComputeCallback,
) => Result<void, NoPathFound>;

/**
 * The direction vectors used for neighbor lookups, in the order pathfinders
 * should try them (reordered for 8-topology so vertical/horizontal directions
 * come first, for a more aesthetic result).
 */
export function getPathDirs(topology: 4 | 6 | 8): [number, number][] {
	const dirs = DIRS[topology].map(toXy);
	if (topology === 8) {
		const [d0, d1, d2, d3, d4, d5, d6, d7] = dirs;
		if (
			d0 === undefined ||
			d1 === undefined ||
			d2 === undefined ||
			d3 === undefined ||
			d4 === undefined ||
			d5 === undefined ||
			d6 === undefined ||
			d7 === undefined
		) {
			throw new Error("unreachable: 8-topology must have 8 direction vectors");
		}
		return [d0, d2, d4, d6, d1, d3, d5, d7];
	}
	return dirs;
}

/** Passable neighbors of (cx, cy) along the given direction vectors. */
export function getNeighbors(
	dirs: readonly [number, number][],
	passable: PassableCallback,
	cx: number,
	cy: number,
): [number, number][] {
	const result: [number, number][] = [];
	for (const [dx, dy] of dirs) {
		const x = cx + dx;
		const y = cy + dy;
		if (!passable(x, y)) {
			continue;
		}
		result.push([x, y]);
	}
	return result;
}
