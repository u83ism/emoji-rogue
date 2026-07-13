import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { createDiggerMap } from "../map/digger.js";
import { getRoomCenter } from "../map/features.js";
import { encodePointKey } from "../pointkey.js";
import { createRng, type Rng, seedToState } from "../rng.js";
import type { GameState, Position } from "./state.js";
import { computeVisiblePoints, deriveExploredState } from "./vision.js";

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
 * Up to ENEMY_COUNT spawn positions, drawn from floor tiles outside the
 * player's starting field of view (so no enemy is on screen at turn one).
 * Room-independent on purpose: digger occasionally produces a single-room,
 * corridor-heavy dungeon, and a room-based spawn would then find nowhere to
 * put enemies. Falls back to any floor tile except the player's own when
 * the whole map is visible from the start.
 */
const createRandomEnemySpawns = (
	rng: Rng,
	terrain: GameState["terrain"],
	player: Position,
): Position[] => {
	const visiblePoints = computeVisiblePoints(terrain, player);
	const collectFloorTiles = (outOfSightOnly: boolean): Position[] => {
		const tiles: Position[] = [];
		for (let x = 0; x < terrain.length; x++) {
			const column = terrain[x] ?? [];
			for (let y = 0; y < column.length; y++) {
				if (column[y] !== 0) {
					continue;
				}
				if (x === player.x && y === player.y) {
					continue;
				}
				if (outOfSightOnly && visiblePoints.has(encodePointKey(x, y))) {
					continue;
				}
				tiles.push({ x, y });
			}
		}
		return tiles;
	};

	const candidates = collectFloorTiles(true);
	const pool = candidates.length > 0 ? candidates : collectFloorTiles(false);

	const enemies: Position[] = [];
	for (let i = 0; i < ENEMY_COUNT && pool.length > 0; i++) {
		const index = rng.getUniformInt(0, pool.length - 1);
		enemies.push(at(pool, index));
		pool.splice(index, 1);
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
		enemies: createRandomEnemySpawns(rng, columns, player),
		rng: rng.getState(),
		status: "playing",
	});
}
