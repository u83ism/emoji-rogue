import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { createRng, seedToState } from "../rng.js";
import { PLAYER_MAX_HP } from "./balance.js";
import { buildEmptyColumns, buildUnexploredColumns } from "./columns.js";
import { buildFloorLayout } from "./floor.js";
import type { GameState, Position } from "./state.js";
import { deriveExploredState } from "./vision.js";

/**
 * The bottom-right-most floor tile that is not the player's own — a fixed,
 * deterministic staircase spot for the arena fixture. Falls back to the
 * player's tile on a one-tile arena (standing on stairs triggers nothing;
 * only moving onto them does).
 */
const pickArenaStairs = (
	terrain: readonly (readonly number[])[],
	player: Position,
): Position => {
	for (let x = terrain.length - 1; x >= 0; x--) {
		const column = terrain[x] ?? [];
		for (let y = column.length - 1; y >= 0; y--) {
			if (column[y] === 0 && !(x === player.x && y === player.y)) {
				return { x, y };
			}
		}
	}
	return player;
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
	const player: Position = {
		x: Math.floor(width / 2),
		y: Math.floor(height / 2),
	};

	return deriveExploredState({
		width,
		height,
		terrain: columns,
		explored: buildUnexploredColumns(width, height),
		player,
		playerHp: PLAYER_MAX_HP,
		enemies: [],
		floor: 1,
		stairs: pickArenaStairs(columns, player),
		events: [],
		rng: seedToState(seed),
		status: "playing",
	});
}

/**
 * A digger-generated dungeon (floor 1) with the player at the center of the
 * first room. The RNG state stored in the result is the state *after*
 * generation consumed it, so later turns — and later floors — continue the
 * same seeded stream; this is what makes a whole run reproducible from
 * (dimensions, seed) alone. Pure: deterministic in its arguments.
 */
export function buildDungeonGameState(
	width: number,
	height: number,
	seed: number,
): GameState {
	const rng = createRng(seed);
	const layout = buildFloorLayout(width, height, rng);

	return deriveExploredState({
		width,
		height,
		terrain: layout.terrain,
		explored: buildUnexploredColumns(width, height),
		player: layout.player,
		playerHp: PLAYER_MAX_HP,
		enemies: layout.enemies,
		floor: 1,
		stairs: layout.stairs,
		events: [],
		rng: rng.getState(),
		status: "playing",
	});
}
