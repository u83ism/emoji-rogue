import type { Room } from "../../map/features.js";
import type { Rng } from "../../rng.js";
import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD,
	ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD,
	ROOM_GOLD_CHANCE_PERCENT,
} from "../balance.js";
import { rollsCarriedItem } from "../enemies/enemyPack.js";
import { hasItemIdentity } from "../events.js";
import { buildFloorItem } from "../items/inventory/heldItemFactory.js";
import type { Enemy, GoldPile, Position } from "../state.js";
import { buildSpawnedEnemy, drawEnemyKindForFloor } from "./enemies.js";
import { drawItemKind } from "./items.js";
import { drawSpawnTileWhere, isInsideRoom } from "./spawnPool.js";

/** What the rooms of a fresh floor hold — see drawRoomContents. */
export interface RoomContents {
	readonly enemies: readonly Enemy[];
	readonly goldPiles: readonly GoldPile[];
	/** `nextItemId` after the carried items took theirs. */
	readonly nextItemId: number;
	/** The food drought counter after the carried items (one of them may be food). */
	readonly floorsWithoutFood: number;
}

/** One pile of gold's worth on `floor` — original Rogue's GOLDCALC. */
export const drawGoldAmount = (rng: Rng, floor: number): number =>
	rng.getUniformInt(GOLD_AMOUNT_MIN, calculateGoldAmountMax(floor));

/**
 * The gold and the enemies of a fresh floor, room by room as original
 * Rogue's do_rooms() does it, drawn from (and removed from) `pool` by
 * consuming `rng`. Each room first rolls ROOM_GOLD_CHANCE_PERCENT for one
 * pile of gold on one of its own pooled tiles, then rolls for one sleeping
 * enemy — ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD if the pile was placed,
 * ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD otherwise — of a kind
 * drawEnemyKindForFloor picks for this depth.
 *
 * A monster may carry an item (enemies/enemyPack.ts's rollsCarriedItem —
 * original Rogue's give_pack(), drawn like any found item), taking an
 * itemId from `startItemId` and touching the food drought counter.
 *
 * `placesGold` false is the original's "climbing back with the amulet"
 * rule (no carried items either): the gold roll is still made, but no room gets a pile (so every room
 * rolls the lower enemy chance). A room with no pooled tile (the player's
 * own, fully in view) gets neither gold nor an enemy.
 */
export const drawRoomContents = (
	pool: Position[],
	rng: Rng,
	floor: number,
	rooms: readonly Room[],
	placesGold: boolean,
	startItemId: number,
	previousFloorsWithoutFood: number,
): RoomContents => {
	const enemies: Enemy[] = [];
	const goldPiles: GoldPile[] = [];
	let nextItemId = startItemId;
	let floorsWithoutFood = previousFloorsWithoutFood;
	for (const room of rooms) {
		const isInThisRoom = (tile: Position): boolean => isInsideRoom(room, tile);
		const goldRollLanded =
			rng.getUniformInt(0, 99) < ROOM_GOLD_CHANCE_PERCENT && placesGold;
		const goldTile = goldRollLanded
			? drawSpawnTileWhere(pool, rng, isInThisRoom)
			: undefined;
		if (goldTile !== undefined) {
			goldPiles.push({ ...goldTile, amount: drawGoldAmount(rng, floor) });
		}

		const enemyChancePercent =
			goldTile !== undefined
				? ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD
				: ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD;
		if (rng.getUniformInt(0, 99) >= enemyChancePercent) {
			continue;
		}
		const enemyTile = drawSpawnTileWhere(pool, rng, isInThisRoom);
		if (enemyTile === undefined) {
			continue;
		}
		const enemy = buildSpawnedEnemy(
			drawEnemyKindForFloor(rng, floor),
			enemyTile,
			rng,
			floor,
		);
		if (!rollsCarriedItem(rng, enemy.kind, placesGold)) {
			enemies.push(enemy);
			continue;
		}
		/* original Rogue's give_pack(): one new_thing() for the monster to hold */
		const kind = drawItemKind(rng, floorsWithoutFood);
		if (kind === "food-ration") {
			floorsWithoutFood = 0;
		}
		enemies.push({
			...enemy,
			carried: [buildFloorItem(kind, nextItemId, enemyTile, rng)],
		});
		if (hasItemIdentity(kind)) {
			nextItemId += 1;
		}
	}
	return { enemies, goldPiles, nextItemId, floorsWithoutFood };
};
