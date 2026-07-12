import type { CreateCallback } from "./map.js";

/**
 * Simple empty rectangular room.
 */
export function createArenaMap(
	width: number,
	height: number,
	callback: CreateCallback,
): void {
	const w = width - 1;
	const h = height - 1;
	for (let i = 0; i <= w; i++) {
		for (let j = 0; j <= h; j++) {
			const empty = i && j && i < w && j < h;
			callback(i, j, empty ? 0 : 1);
		}
	}
}
