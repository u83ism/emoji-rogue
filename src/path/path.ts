import { DIRS } from "../constants.js";

export type ComputeCallback = (x: number, y: number) => void;
export type PassableCallback = (x: number, y: number) => boolean;

export interface PathOptions {
	topology: 4 | 6 | 8;
}

/** Computes a path from (fromX, fromY) towards a target fixed at creation time. */
export type Path = (
	fromX: number,
	fromY: number,
	callback: ComputeCallback,
) => void;

function toXy(pair: readonly number[] | undefined): [number, number] {
	if (pair === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	const [dx, dy] = pair;
	if (dx === undefined || dy === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	return [dx, dy];
}

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
