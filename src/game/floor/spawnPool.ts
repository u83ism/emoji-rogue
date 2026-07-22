import { at } from "../../indexing.js";
import type { Room } from "../../map/features.js";
import { decodePointKey, encodePointKey } from "../../pointkey.js";
import type { Rng } from "../../rng.js";
import type { GameState, Position } from "../state.js";
import { computeVisiblePoints, VIEW_RADIUS } from "../vision.js";

/** One independent per-floor percent roll: `kind` spawns when the roll lands. */
export interface SpawnChance<Kind> {
	readonly kind: Kind;
	readonly chancePercent: number;
	/** Rolled only on floors >= this value; omitted rolls on every floor (the default before this field existed). */
	readonly minFloor?: number;
}

/** One random tile out of the pool, removed from it (no tile spawns twice). */
export const drawSpawnTile = (pool: Position[], rng: Rng): Position => {
	const index = rng.getUniformInt(0, pool.length - 1);
	const picked = at(pool, index);
	pool.splice(index, 1);
	return picked;
};

/**
 * Same as drawSpawnTile, but restricted to tiles satisfying `isEligible`.
 * Undefined when no pooled tile qualifies — consuming no rng in that case,
 * so callers can fall back without disturbing the seeded stream.
 */
export const drawSpawnTileWhere = (
	pool: Position[],
	rng: Rng,
	isEligible: (position: Position) => boolean,
): Position | undefined => {
	const eligibleIndexes = pool
		.map((_, index) => index)
		.filter((index) => isEligible(at(pool, index)));
	if (eligibleIndexes.length === 0) {
		return undefined;
	}
	const pickedIndex = at(
		eligibleIndexes,
		rng.getUniformInt(0, eligibleIndexes.length - 1),
	);
	const picked = at(pool, pickedIndex);
	pool.splice(pickedIndex, 1);
	return picked;
};

const isInsideRoom = (room: Room, position: Position): boolean =>
	position.x >= room.x1 &&
	position.x <= room.x2 &&
	position.y >= room.y1 &&
	position.y <= room.y2;

/** Within one tile (Chebyshev) of any of the room's door tiles. */
const isNearDoor = (room: Room, position: Position): boolean =>
	Object.keys(room.doors).some((doorKey) => {
		const [doorX, doorY] = decodePointKey(doorKey);
		return (
			Math.abs(doorX - position.x) <= 1 && Math.abs(doorY - position.y) <= 1
		);
	});

/**
 * Whether `position` lies inside some room's interior AND away from that
 * room's doorways — a tile the player can always walk around. Stairs and
 * traps are restricted to such tiles (2026-07-18 playtest feedback): stepping
 * on stairs descends immediately and traps are invisible, so either of them
 * on a corridor or doorway tile is unavoidable and can physically block
 * exploration.
 */
export const isRoomTileAwayFromDoors = (
	rooms: readonly Room[],
	position: Position,
): boolean =>
	rooms.some(
		(room) => isInsideRoom(room, position) && !isNearDoor(room, position),
	);

/**
 * Same as drawSpawnTile, but restricted to one room's interior (room.x1..x2,
 * room.y1..y2 are inclusive floor bounds — the walls sit one tile further
 * out). Undefined if the pool has no tile left inside that room — see
 * floorEnemies.ts's monster house roll.
 */
export const drawSpawnTileInRoom = (
	pool: Position[],
	room: Room,
	rng: Rng,
): Position | undefined =>
	drawSpawnTileWhere(pool, rng, (position) => isInsideRoom(room, position));

/**
 * Floor tiles usable for spawning things away from the player: outside the
 * starting field of view when possible (nothing pops up on screen at turn
 * one), any floor tile except the player's own otherwise (tiny fully-visible
 * maps). Room-independent on purpose: digger occasionally produces a
 * single-room, corridor-heavy dungeon.
 */
export const collectSpawnPool = (
	terrain: GameState["terrain"],
	player: Position,
): Position[] => {
	/* the plain VIEW_RADIUS on purpose: at generation time the spawn pool must
	 * hide things from the normal-sighted view, even if the player is
	 * currently blind (blindness fading must not make items pop into sight) */
	const visiblePoints = computeVisiblePoints(terrain, player, VIEW_RADIUS);
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
	return candidates.length > 0 ? candidates : collectFloorTiles(false);
};
