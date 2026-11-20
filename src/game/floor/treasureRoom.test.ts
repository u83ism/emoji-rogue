import { describe, expect, it } from "vitest";
import type { Room } from "../../map/features.js";
import { createRng, type Rng } from "../../rng.js";
import { TREASURE_ROOM_MIN } from "../balance.js";
import type { Position } from "../state.js";
import { drawTreasureRoom } from "./treasureRoom.js";

/** Every roll at its lowest: the 1-in-20 treasure roll lands. */
const createLowestRollRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

const ROOM: Room = { kind: "room", x1: 2, y1: 2, x2: 7, y2: 5, doors: {} };

const buildPool = (): Position[] => {
	const tiles: Position[] = [];
	for (let x = 2; x <= 7; x++) {
		for (let y = 2; y <= 5; y++) {
			tiles.push({ x, y });
		}
	}
	return tiles;
};

describe("drawTreasureRoom", () => {
	it("fills one room with items and at least two more monsters of the floor below", () => {
		const treasure = drawTreasureRoom(
			buildPool(),
			createLowestRollRng(),
			3,
			[ROOM],
			true,
			1,
			0,
		);
		expect(treasure.items).toHaveLength(TREASURE_ROOM_MIN);
		expect(treasure.enemies).toHaveLength(TREASURE_ROOM_MIN + 2);
		for (const thing of [...treasure.items, ...treasure.enemies]) {
			expect(thing.x).toBeGreaterThanOrEqual(2);
			expect(thing.x).toBeLessThanOrEqual(7);
		}
	});

	it("is rare — about 1 floor in 20 — and never while climbing back with the amulet", () => {
		const rng = createRng(11);
		let rooms = 0;
		for (let floor = 0; floor < 1000; floor++) {
			if (
				drawTreasureRoom(buildPool(), rng, 3, [ROOM], true, 1, 0).enemies
					.length > 0
			) {
				rooms += 1;
			}
		}
		expect(rooms).toBeGreaterThan(25);
		expect(rooms).toBeLessThan(80);
		expect(
			drawTreasureRoom(
				buildPool(),
				createLowestRollRng(),
				3,
				[ROOM],
				false,
				1,
				0,
			).enemies,
		).toEqual([]);
	});
});
