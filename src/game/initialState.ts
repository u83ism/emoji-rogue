import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { createDiggerMap } from "../map/digger.js";
import { getRoomCenter } from "../map/features.js";
import { createRng, seedToState } from "../rng.js";
import type { GameState } from "./state.js";

const buildEmptyColumns = (width: number): number[][] => {
	const columns: number[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push([]);
	}
	return columns;
};

/**
 * An empty arena (floor everywhere, walls on the perimeter) with the player
 * at the center. Kept as the simplest possible state, mainly for tests.
 * Pure: the same dimensions and seed always produce the same state.
 */
export function buildArenaGameState(
	width: number,
	height: number,
	seed: number,
): GameState {
	if (width < 3 || height < 3) {
		throw new Error(
			"unreachable: arena needs room for at least one floor tile",
		);
	}

	const columns = buildEmptyColumns(width);
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

/**
 * A digger-generated dungeon with the player at the center of the first
 * room. The RNG state stored in the result is the state *after* generation
 * consumed it, so later turns continue the same seeded stream — this is what
 * makes a whole run reproducible from (dimensions, seed) alone.
 * Pure: deterministic in its arguments; the RNG never escapes.
 */
export function buildDungeonGameState(
	width: number,
	height: number,
	seed: number,
): GameState {
	const rng = createRng(seed);
	const columns = buildEmptyColumns(width);
	const dungeon = createDiggerMap(width, height, rng).create((x, y, value) => {
		at(columns, x)[y] = value;
	});

	const firstRoom = dungeon.getRooms()[0];
	if (firstRoom === undefined) {
		throw new Error("unreachable: digger always digs at least one room");
	}
	const [playerX, playerY] = getRoomCenter(firstRoom);

	return {
		width,
		height,
		terrain: columns,
		player: { x: playerX, y: playerY },
		rng: rng.getState(),
		status: "playing",
	};
}
