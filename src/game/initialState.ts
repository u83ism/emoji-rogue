import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { seedToState } from "../rng.js";
import type { GameState } from "./state.js";

/**
 * The milestone-1 starting state: an empty arena (floor everywhere, walls on
 * the perimeter) with the player at the center. Pure: the same dimensions and
 * seed always produce the same state.
 */
export function buildInitialGameState(
	width: number,
	height: number,
	seed: number,
): GameState {
	if (width < 3 || height < 3) {
		throw new Error(
			"unreachable: arena needs room for at least one floor tile",
		);
	}

	const columns: number[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push([]);
	}
	createArenaMap(width, height, (x, y, value) => {
		at(columns, x)[y] = value;
	});

	return {
		width,
		height,
		terrain: columns,
		player: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
		rng: seedToState(seed),
		status: "playing",
	};
}
