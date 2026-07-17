import { describe, expect, it } from "vitest";
import { addDoor, type Room } from "../../map/features.js";
import { createRng } from "../../rng.js";
import type { Position } from "../state.js";
import { drawSpawnTileWhere, isRoomTileAwayFromDoors } from "./spawnPool.js";

describe("isRoomTileAwayFromDoors", () => {
	/* a 5x5 interior room (10..14, 10..14) with a door in the middle of its top wall */
	const room: Room = {
		kind: "room",
		x1: 10,
		y1: 10,
		x2: 14,
		y2: 14,
		doors: {},
	};
	addDoor(room, 12, 9);
	const rooms = [room];

	it("accepts an interior tile away from the door", () => {
		expect(isRoomTileAwayFromDoors(rooms, { x: 10, y: 14 })).toBe(true);
		expect(isRoomTileAwayFromDoors(rooms, { x: 12, y: 12 })).toBe(true);
	});

	it("rejects tiles within one step of the door, diagonals included", () => {
		expect(isRoomTileAwayFromDoors(rooms, { x: 12, y: 10 })).toBe(false);
		expect(isRoomTileAwayFromDoors(rooms, { x: 11, y: 10 })).toBe(false);
		expect(isRoomTileAwayFromDoors(rooms, { x: 13, y: 10 })).toBe(false);
	});

	it("rejects corridor tiles (outside every room)", () => {
		expect(isRoomTileAwayFromDoors(rooms, { x: 5, y: 5 })).toBe(false);
		expect(isRoomTileAwayFromDoors(rooms, { x: 12, y: 9 })).toBe(false);
	});
});

describe("drawSpawnTileWhere", () => {
	it("draws only eligible tiles and removes the drawn tile from the pool", () => {
		const pool: Position[] = [
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			{ x: 3, y: 0 },
		];
		const picked = drawSpawnTileWhere(
			pool,
			createRng(1),
			(position) => position.x === 2,
		);
		expect(picked).toEqual({ x: 2, y: 0 });
		expect(pool).toEqual([
			{ x: 1, y: 0 },
			{ x: 3, y: 0 },
		]);
	});

	it("returns undefined and leaves the pool untouched when nothing qualifies", () => {
		const pool: Position[] = [{ x: 1, y: 0 }];
		expect(drawSpawnTileWhere(pool, createRng(1), () => false)).toBe(undefined);
		expect(pool.length).toBe(1);
	});
});
