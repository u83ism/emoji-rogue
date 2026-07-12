import { DIRS } from "../constants.js";

export type LightPassesCallback = (x: number, y: number) => boolean;

export type VisibilityCallback = (
	x: number,
	y: number,
	r: number,
	visibility: number,
) => void;

export interface FovOptions {
	topology: 4 | 6 | 8;
}

/** Computes visibility for a 360-degree circle around (x, y) up to radius R. */
export type Fov = (
	x: number,
	y: number,
	radius: number,
	callback: VisibilityCallback,
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

/** Return all neighbors in a concentric ring around (cx, cy) at range r. */
export function getCircle(
	topology: 4 | 6 | 8,
	cx: number,
	cy: number,
	r: number,
): [number, number][] {
	let dirs: [number, number][];
	let countFactor: number;
	let startOffset: [number, number];

	switch (topology) {
		case 4:
			countFactor = 1;
			startOffset = [0, 1];
			dirs = [
				toXy(DIRS[8][7]),
				toXy(DIRS[8][1]),
				toXy(DIRS[8][3]),
				toXy(DIRS[8][5]),
			];
			break;

		case 6:
			dirs = DIRS[6].map(toXy);
			countFactor = 1;
			startOffset = [-1, 1];
			break;

		case 8:
			dirs = DIRS[4].map(toXy);
			countFactor = 2;
			startOffset = [-1, 1];
			break;

		default:
			throw new Error("Incorrect topology for FOV computation");
	}

	const result: [number, number][] = [];

	/* starting neighbor */
	let x = cx + startOffset[0] * r;
	let y = cy + startOffset[1] * r;

	/* circle */
	for (const [dx, dy] of dirs) {
		for (let j = 0; j < r * countFactor; j++) {
			result.push([x, y]);
			x += dx;
			y += dy;
		}
	}

	return result;
}
