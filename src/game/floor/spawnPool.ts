import { at } from "../../indexing.js";
import type { Room } from "../../map/features.js";
import { encodePointKey } from "../../pointkey.js";
import type { Rng } from "../../rng.js";
import type { GameState, Position } from "../state.js";
import { computeVisiblePoints, VIEW_RADIUS } from "../vision.js";

/** One independent per-floor percent roll: `kind` spawns when the roll lands. */
export interface SpawnChance<Kind> {
	readonly kind: Kind;
	readonly chancePercent: number;
}

/** One random tile out of the pool, removed from it (no tile spawns twice). */
export const drawSpawnTile = (pool: Position[], rng: Rng): Position => {
	const index = rng.getUniformInt(0, pool.length - 1);
	const picked = at(pool, index);
	pool.splice(index, 1);
	return picked;
};

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
): Position | undefined => {
	const indexesInRoom = pool
		.map((_, index) => index)
		.filter((index) => {
			const position = at(pool, index);
			return (
				position.x >= room.x1 &&
				position.x <= room.x2 &&
				position.y >= room.y1 &&
				position.y <= room.y2
			);
		});
	if (indexesInRoom.length === 0) {
		return undefined;
	}
	const pickedIndex = at(
		indexesInRoom,
		rng.getUniformInt(0, indexesInRoom.length - 1),
	);
	const picked = at(pool, pickedIndex);
	pool.splice(pickedIndex, 1);
	return picked;
};

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
