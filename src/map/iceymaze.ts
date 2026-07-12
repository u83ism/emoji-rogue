import type { Rng } from "../rng.js";
import type { CreateCallback } from "./map.js";
import { fillMap } from "./map.js";

type Dirs = [
	[number, number],
	[number, number],
	[number, number],
	[number, number],
];

function randomizeDirs(rng: Rng): Dirs {
	const dirs: Dirs = [
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
	];

	switch (Math.floor(rng.getUniform() * 4)) {
		case 0:
			dirs[0][0] = -1;
			dirs[1][0] = 1;
			dirs[2][1] = -1;
			dirs[3][1] = 1;
			break;
		case 1:
			dirs[3][0] = -1;
			dirs[2][0] = 1;
			dirs[1][1] = -1;
			dirs[0][1] = 1;
			break;
		case 2:
			dirs[2][0] = -1;
			dirs[3][0] = 1;
			dirs[0][1] = -1;
			dirs[1][1] = 1;
			break;
		case 3:
			dirs[1][0] = -1;
			dirs[0][0] = 1;
			dirs[3][1] = -1;
			dirs[2][1] = 1;
			break;
	}

	return dirs;
}

function isFree(
	map: readonly number[][],
	x: number,
	y: number,
	width: number,
	height: number,
): boolean {
	if (x < 1 || y < 1 || x >= width || y >= height) {
		return false;
	}
	const column = map[x];
	return column !== undefined && column[y] !== 0;
}

/**
 * Icey's Maze generator.
 * See http://www.roguebasin.roguelikedevelopment.org/index.php?title=Simple_maze for explanation.
 */
export function createIceyMazeMap(
	widthInput: number,
	heightInput: number,
	rng: Rng,
	callback: CreateCallback,
	regularity = 0,
): void {
	const map = fillMap(widthInput, heightInput, 1);

	const width = widthInput - (widthInput % 2 ? 1 : 2);
	const height = heightInput - (heightInput % 2 ? 1 : 2);

	let cx = 0;
	let cy = 0;

	let done = 0;
	let blocked = false;
	let dirs: Dirs = [
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
	];

	do {
		cx = 1 + 2 * Math.floor((rng.getUniform() * (width - 1)) / 2);
		cy = 1 + 2 * Math.floor((rng.getUniform() * (height - 1)) / 2);

		const startColumn = map[cx];
		if (startColumn === undefined)
			throw new Error("unreachable: cx within width");

		if (!done) {
			startColumn[cy] = 0;
		}

		if (!startColumn[cy]) {
			dirs = randomizeDirs(rng);
			do {
				if (Math.floor(rng.getUniform() * (regularity + 1)) === 0) {
					dirs = randomizeDirs(rng);
				}
				blocked = true;
				for (const [dx, dy] of dirs) {
					const nx = cx + dx * 2;
					const ny = cy + dy * 2;
					if (isFree(map, nx, ny, width, height)) {
						const nextColumn = map[nx];
						const midColumn = map[cx + dx];
						if (nextColumn === undefined || midColumn === undefined) {
							throw new Error("unreachable: nx/cx+dx within width");
						}
						nextColumn[ny] = 0;
						midColumn[cy + dy] = 0;

						cx = nx;
						cy = ny;
						blocked = false;
						done++;
						break;
					}
				}
			} while (!blocked);
		}
	} while (done + 1 < (width * height) / 4);

	for (let i = 0; i < widthInput; i++) {
		const column = map[i];
		if (column === undefined) throw new Error("unreachable: i within width");
		for (let j = 0; j < heightInput; j++) {
			const value = column[j];
			if (value === undefined) throw new Error("unreachable: j within height");
			callback(i, j, value);
		}
	}
}
