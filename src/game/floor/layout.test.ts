import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import { calculateGoldAmountMax, GOLD_AMOUNT_MIN } from "../balance.js";
import { buildFloorLayout } from "./layout.js";
import { isInsideRoom, isRoomTileAwayFromDoors } from "./spawnPool.js";

// Layout-level tests only. Per-kind spawn behavior is covered
// deterministically in floorEnemies.test.ts / floorItems.test.ts, and the
// full real-seed integration (nothing overlaps, everything on floor tiles)
// in floor.test.ts's descendStairs suite.

describe("buildFloorLayout", () => {
	it("is deterministic: the same rng state produces the same layout", () => {
		const first = buildFloorLayout(40, 20, createRng(7), 1, false, 1, 0, true);
		const second = buildFloorLayout(40, 20, createRng(7), 1, false, 1, 0, true);
		expect(second).toEqual(first);
	});

	it("places the player and the staircase on floor tiles", () => {
		const layout = buildFloorLayout(40, 20, createRng(7), 1, false, 1, 0, true);
		expect(layout.terrain[layout.player.x]?.[layout.player.y]).toBe(0);
		expect(layout.terrain[layout.stairs.x]?.[layout.stairs.y]).toBe(0);
	});

	it("places the amulet on a floor tile only when told to, with a staircase either way", () => {
		const plain = buildFloorLayout(40, 20, createRng(7), 2, false, 1, 0, true);
		expect(plain.amulet).toBeUndefined();

		const withAmulet = buildFloorLayout(
			40,
			20,
			createRng(7),
			30,
			true,
			1,
			0,
			true,
		);
		expect(withAmulet.amulet).not.toBeUndefined();
		if (withAmulet.amulet !== undefined) {
			expect(
				withAmulet.terrain[withAmulet.amulet.x]?.[withAmulet.amulet.y],
			).toBe(0);
		}
		expect(withAmulet.terrain[withAmulet.stairs.x]?.[withAmulet.stairs.y]).toBe(
			0,
		);
	});

	it("places the staircase inside a room, away from doorways", () => {
		for (let seed = 1; seed <= 15; seed++) {
			const layout = buildFloorLayout(
				40,
				20,
				createRng(seed),
				2,
				false,
				1,
				0,
				true,
			);
			expect(isRoomTileAwayFromDoors(layout.rooms, layout.stairs)).toBe(true);
		}
	});

	it("puts gold only inside rooms, sized for the floor, and none at all when told not to", () => {
		let pileCount = 0;
		for (let seed = 1; seed <= 15; seed++) {
			const layout = buildFloorLayout(
				40,
				20,
				createRng(seed),
				4,
				false,
				1,
				0,
				true,
			);
			for (const pile of layout.goldPiles) {
				expect(layout.rooms.some((room) => isInsideRoom(room, pile))).toBe(
					true,
				);
				expect(pile.amount).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
				expect(pile.amount).toBeLessThanOrEqual(calculateGoldAmountMax(4));
			}
			expect(layout.goldPiles.length).toBeLessThanOrEqual(layout.rooms.length);
			pileCount += layout.goldPiles.length;

			const bare = buildFloorLayout(
				40,
				20,
				createRng(seed),
				4,
				false,
				1,
				0,
				false,
			);
			expect(bare.goldPiles).toEqual([]);
		}
		expect(pileCount).toBeGreaterThan(0);
	});

	it("places every trap inside a room, away from doorways", () => {
		for (let seed = 1; seed <= 15; seed++) {
			const layout = buildFloorLayout(
				40,
				20,
				createRng(seed),
				2,
				false,
				1,
				0,
				true,
			);
			for (const trap of layout.traps) {
				expect(isRoomTileAwayFromDoors(layout.rooms, trap)).toBe(true);
			}
		}
	});
});

describe("rooms one tile thick", () => {
	it("never count as rooms — on the game's 40x20 map they are corridors to the eye", () => {
		for (let seed = 1; seed <= 50; seed++) {
			const layout = buildFloorLayout(
				40,
				20,
				createRng(seed),
				1,
				false,
				1,
				0,
				true,
			);
			for (const room of layout.dungeonRooms) {
				expect(room.x2).toBeGreaterThan(room.x1);
				expect(room.y2).toBeGreaterThan(room.y1);
			}
		}
	});
});
