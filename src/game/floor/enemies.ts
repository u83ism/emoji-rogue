import { at } from "../../indexing.js";
import type { Room } from "../../map/features.js";
import type { Rng } from "../../rng.js";
import { ROOM_ENEMY_SPAWN_CHANCE_PERCENT } from "../balance.js";
import {
	ENEMY_DEPTH_ORDER,
	ENEMY_HP_DICE_SIDES,
	ENEMY_STATS,
} from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, Position } from "../state.js";
import { drawSpawnTileWhere, isInsideRoom } from "./spawnPool.js";

/** How far below (and, minus one, above) its own floor's entry of ENEMY_DEPTH_ORDER a floor can draw — original Rogue's `level + (rnd(10) - 6)`. */
const DEPTH_WINDOW_SIZE = 10;
const DEPTH_WINDOW_OFFSET = 6;
/** A draw that falls off either end of ENEMY_DEPTH_ORDER is redrawn among this many entries at that end. */
const DEPTH_EDGE_SIZE = 5;

/**
 * Which kind spawns on `floor` — original Rogue's randmonster(): an index
 * into ENEMY_DEPTH_ORDER drawn from the 10-entry window floor-6..floor+3,
 * so each floor deeper retires the weakest candidate and admits a stronger
 * one. Off the front of the list it redraws among the first five kinds, off
 * the back among the last five. Consumes `rng` once, or twice on a redraw.
 */
export const drawEnemyKindForFloor = (rng: Rng, floor: number): EnemyKind => {
	const drawn =
		floor + rng.getUniformInt(0, DEPTH_WINDOW_SIZE - 1) - DEPTH_WINDOW_OFFSET;
	if (drawn < 0) {
		return at(ENEMY_DEPTH_ORDER, rng.getUniformInt(0, DEPTH_EDGE_SIZE - 1));
	}
	if (drawn >= ENEMY_DEPTH_ORDER.length) {
		return at(
			ENEMY_DEPTH_ORDER,
			ENEMY_DEPTH_ORDER.length -
				DEPTH_EDGE_SIZE +
				rng.getUniformInt(0, DEPTH_EDGE_SIZE - 1),
		);
	}
	return at(ENEMY_DEPTH_ORDER, drawn);
};

/** The first and last floor `kind` can spawn on (before clamping to the dungeon's own depth) — the floors whose window in drawEnemyKindForFloor reaches its entry. */
export const calculateEnemyFloorRange = (
	kind: EnemyKind,
): { readonly firstFloor: number; readonly lastFloor: number } => {
	const index = ENEMY_DEPTH_ORDER.indexOf(kind);
	return {
		firstFloor: Math.max(
			1,
			index - (DEPTH_WINDOW_SIZE - 1 - DEPTH_WINDOW_OFFSET),
		),
		lastFloor: index + DEPTH_WINDOW_OFFSET,
	};
};

/** A fresh, sleeping `kind` at `position`, its HP rolled as level d8 (original Rogue's new_monster). */
export const buildSpawnedEnemy = (
	kind: EnemyKind,
	position: Position,
	rng: Rng,
): Enemy => {
	let maxHp = 0;
	for (let dieIndex = 0; dieIndex < ENEMY_STATS[kind].level; dieIndex++) {
		maxHp += rng.getUniformInt(1, ENEMY_HP_DICE_SIDES);
	}
	return {
		...position,
		kind,
		hp: maxHp,
		maxHp,
		awake: false,
		slowedTurnsRemaining: 0,
		confusedTurnsRemaining: 0,
	};
};

/**
 * Every enemy on a fresh floor, drawn from (and removed from) `pool` by
 * consuming `rng`: each room rolls ROOM_ENEMY_SPAWN_CHANCE_PERCENT once for
 * a single enemy on one of its own pooled tiles, of a kind
 * drawEnemyKindForFloor picks for this depth. A room with no pooled tile
 * (the player's own, fully in view) is skipped without drawing a kind. All
 * spawn asleep.
 */
export const drawFloorEnemies = (
	pool: Position[],
	rng: Rng,
	floor: number,
	rooms: readonly Room[],
): Enemy[] => {
	const enemies: Enemy[] = [];
	for (const room of rooms) {
		if (rng.getUniformInt(0, 99) >= ROOM_ENEMY_SPAWN_CHANCE_PERCENT) {
			continue;
		}
		const position = drawSpawnTileWhere(pool, rng, (tile) =>
			isInsideRoom(room, tile),
		);
		if (position === undefined) {
			continue;
		}
		enemies.push(
			buildSpawnedEnemy(drawEnemyKindForFloor(rng, floor), position, rng),
		);
	}
	return enemies;
};
