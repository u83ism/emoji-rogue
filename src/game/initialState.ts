import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { createDiggerMap } from "../map/digger.js";
import {
	getRoomBottom,
	getRoomCenter,
	getRoomLeft,
	getRoomRight,
	getRoomTop,
	type Room,
} from "../map/features.js";
import { createRng, type Rng, seedToState } from "../rng.js";
import type { GameState, Position } from "./state.js";
import { deriveExploredState } from "./vision.js";

const ENEMY_COUNT = 3;

const buildEmptyColumns = (width: number): number[][] => {
	const columns: number[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push([]);
	}
	return columns;
};

const buildUnexploredColumns = (width: number, height: number): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push(new Array<boolean>(height).fill(false));
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

	return deriveExploredState({
		width,
		height,
		terrain: columns,
		explored: buildUnexploredColumns(width, height),
		player: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
		enemies: [],
		rng: seedToState(seed),
		status: "playing",
	});
}

/**
 * Up to ENEMY_COUNT spawn positions, each a random floor tile in a random
 * room other than the player's starting room. Colliding picks are skipped
 * rather than retried, so sparse dungeons may spawn fewer enemies.
 */
const createRandomEnemySpawns = (
	rng: Rng,
	spawnRooms: readonly Room[],
	player: Position,
): Position[] => {
	const enemies: Position[] = [];
	if (spawnRooms.length === 0) {
		return enemies;
	}
	for (let i = 0; i < ENEMY_COUNT; i++) {
		const room = at(spawnRooms, rng.getUniformInt(0, spawnRooms.length - 1));
		const x = rng.getUniformInt(getRoomLeft(room), getRoomRight(room));
		const y = rng.getUniformInt(getRoomTop(room), getRoomBottom(room));
		const taken =
			(x === player.x && y === player.y) ||
			enemies.some((enemy) => enemy.x === x && enemy.y === y);
		if (!taken) {
			enemies.push({ x, y });
		}
	}
	return enemies;
};

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

	// Doors are deliberately not part of the game's terrain for now: the
	// generator's door records (Room.getDoors) mark every room-adjacent floor
	// cell, which reads poorly in emoji. Sealed until a real door/key gimmick
	// exists — see docs/tasks/game.md backlog.
	const rooms = dungeon.getRooms();
	const firstRoom = rooms[0];
	if (firstRoom === undefined) {
		throw new Error("unreachable: digger always digs at least one room");
	}
	const [playerX, playerY] = getRoomCenter(firstRoom);
	const player: Position = { x: playerX, y: playerY };

	return deriveExploredState({
		width,
		height,
		terrain: columns,
		explored: buildUnexploredColumns(width, height),
		player,
		enemies: createRandomEnemySpawns(rng, rooms.slice(1), player),
		rng: rng.getState(),
		status: "playing",
	});
}
