import type { Rng } from "../rng.js";
import type { CreateCallback } from "./map.js";
import { fillMap } from "./map.js";

type List = number[];

/** Join lists with "i" and "i+1" */
function addToList(i: number, left: List, right: List): void {
	const rightAtI = right[i];
	const leftAtI1 = left[i + 1];
	if (rightAtI === undefined || leftAtI1 === undefined) {
		throw new Error("unreachable: index within list bounds");
	}
	right[leftAtI1] = rightAtI;
	left[rightAtI] = leftAtI1;
	right[i] = i + 1;
	left[i + 1] = i;
}

/** Remove "i" from its list */
function removeFromList(i: number, left: List, right: List): void {
	const leftAtI = left[i];
	const rightAtI = right[i];
	if (leftAtI === undefined || rightAtI === undefined) {
		throw new Error("unreachable: index within list bounds");
	}
	right[leftAtI] = rightAtI;
	left[rightAtI] = leftAtI;
	right[i] = i;
	left[i] = i;
}

/**
 * Maze generator - Eller's algorithm.
 * See http://homepages.cwi.nl/~tromp/maze.html for explanation.
 */
export function createEllerMazeMap(
	width: number,
	height: number,
	rng: Rng,
	callback: CreateCallback,
): void {
	const map = fillMap(width, height, 1);
	const w = Math.ceil((width - 2) / 2);

	const rand = 9 / 24;

	const left: List = [];
	const right: List = [];

	for (let i = 0; i < w; i++) {
		left.push(i);
		right.push(i);
	}
	left.push(w - 1); /* fake stop-block at the right side */

	let j = 1;
	for (; j + 3 < height; j += 2) {
		/* one row */
		for (let i = 0; i < w; i++) {
			/* cell coords (will be always empty) */
			const x = 2 * i + 1;
			const y = j;
			const column = map[x];
			if (column === undefined) throw new Error("unreachable: x within width");
			column[y] = 0;

			/* right connection */
			if (i !== left[i + 1] && rng.getUniform() > rand) {
				addToList(i, left, right);
				const nextColumn = map[x + 1];
				if (nextColumn === undefined) throw new Error("unreachable");
				nextColumn[y] = 0;
			}

			/* bottom connection */
			if (i !== left[i] && rng.getUniform() > rand) {
				/* remove connection */
				removeFromList(i, left, right);
			} else {
				/* create connection */
				column[y + 1] = 0;
			}
		}
	}

	/* last row */
	for (let i = 0; i < w; i++) {
		/* cell coords (will be always empty) */
		const x = 2 * i + 1;
		const y = j;
		const column = map[x];
		if (column === undefined) throw new Error("unreachable: x within width");
		column[y] = 0;

		/* right connection */
		if (i !== left[i + 1] && (i === left[i] || rng.getUniform() > rand)) {
			/* dig right also if the cell is separated, so it gets connected to the rest of maze */
			addToList(i, left, right);
			const nextColumn = map[x + 1];
			if (nextColumn === undefined) throw new Error("unreachable");
			nextColumn[y] = 0;
		}

		removeFromList(i, left, right);
	}

	for (let i = 0; i < width; i++) {
		const column = map[i];
		if (column === undefined) throw new Error("unreachable: i within width");
		for (let j2 = 0; j2 < height; j2++) {
			const value = column[j2];
			if (value === undefined) throw new Error("unreachable: j2 within height");
			callback(i, j2, value);
		}
	}
}
