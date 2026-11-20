import type { Room } from "../../map/features.js";
import type { Rng } from "../../rng.js";
import {
	TREASURE_ROOM_CHANCE_DENOMINATOR,
	TREASURE_ROOM_MAX,
	TREASURE_ROOM_MIN,
} from "../balance.js";
import { rollsCarriedItem } from "../enemies/enemyPack.js";
import { hasItemIdentity } from "../events.js";
import { buildFloorItem } from "../items/heldItemFactory.js";
import type { Enemy, Item, Position } from "../state.js";
import { buildSpawnedEnemy, drawEnemyKindForFloor } from "./enemies.js";
import { drawItemKind } from "./items.js";
import { drawSpawnTileWhere, isInsideRoom } from "./spawnPool.js";

/** What a treasure room adds to a floor — nothing on most floors. */
export interface TreasureRoom {
	readonly items: readonly Item[];
	readonly enemies: readonly Enemy[];
	readonly nextItemId: number;
	readonly floorsWithoutFood: number;
}

/** original Rogue's rnd(n): 0..n-1, and 0 for n of 0 or less. */
const rollBelow = (rng: Rng, bound: number): number =>
	bound > 0 ? rng.getUniformInt(0, bound - 1) : 0;

/**
 * Original Rogue's treas_room(), rolled once a floor with a 1 in
 * TREASURE_ROOM_CHANCE_DENOMINATOR chance (never while climbing back with
 * the amulet — \`restocks\` false). One random room gets
 * TREASURE_ROOM_MIN.. items (fewer in a small room, at most
 * TREASURE_ROOM_MAX), drawn like any found item, and at least two more
 * monsters than items — monsters of the floor below, each maybe carrying
 * an item of its own (enemyPack.ts). They lie asleep like any room's
 * monsters (the original also makes them ISMEAN, quicker to wake).
 */
export const drawTreasureRoom = (
	pool: Position[],
	rng: Rng,
	floor: number,
	rooms: readonly Room[],
	restocks: boolean,
	startItemId: number,
	previousFloorsWithoutFood: number,
): TreasureRoom => {
	const none = {
		items: [],
		enemies: [],
		nextItemId: startItemId,
		floorsWithoutFood: previousFloorsWithoutFood,
	};
	if (
		!restocks ||
		rooms.length === 0 ||
		rng.getUniformInt(0, TREASURE_ROOM_CHANCE_DENOMINATOR - 1) !== 0
	) {
		return none;
	}
	const room = rooms[rng.getUniformInt(0, rooms.length - 1)];
	if (room === undefined) {
		return none;
	}
	const inRoom = (tile: Position): boolean => isInsideRoom(room, tile);
	const interior = (room.x2 - room.x1 + 1) * (room.y2 - room.y1 + 1);
	const spots = Math.min(
		interior - TREASURE_ROOM_MIN,
		TREASURE_ROOM_MAX - TREASURE_ROOM_MIN,
	);
	let nextItemId = startItemId;
	let floorsWithoutFood = previousFloorsWithoutFood;
	const drawItem = (tile: Position): Item => {
		const kind = drawItemKind(rng, floorsWithoutFood);
		if (kind === "food") {
			floorsWithoutFood = 0;
		}
		const item = buildFloorItem(kind, nextItemId, tile, rng);
		if (hasItemIdentity(kind)) {
			nextItemId += 1;
		}
		return item;
	};

	const items: Item[] = [];
	const itemCount = rollBelow(rng, spots) + TREASURE_ROOM_MIN;
	for (let i = 0; i < itemCount; i++) {
		const tile = drawSpawnTileWhere(pool, rng, inRoom);
		if (tile !== undefined) {
			items.push(drawItem(tile));
		}
	}

	const enemies: Enemy[] = [];
	const monsterCount = Math.min(
		interior,
		Math.max(rollBelow(rng, spots) + TREASURE_ROOM_MIN, itemCount + 2),
	);
	for (let i = 0; i < monsterCount; i++) {
		const tile = drawSpawnTileWhere(pool, rng, inRoom);
		if (tile === undefined) {
			break;
		}
		/* "fill up room with monsters from the next level down" */
		const enemy = buildSpawnedEnemy(
			drawEnemyKindForFloor(rng, floor + 1),
			tile,
			rng,
			floor + 1,
		);
		enemies.push(
			rollsCarriedItem(rng, enemy.kind, true)
				? { ...enemy, carried: [drawItem(tile)] }
				: enemy,
		);
	}
	return { items, enemies, nextItemId, floorsWithoutFood };
};
