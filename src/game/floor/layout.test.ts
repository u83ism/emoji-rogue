import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import {
	calculateGoldAmountMax,
	GOAL_FLOOR,
	GOLD_AMOUNT_MIN,
} from "../balance.js";
import { buildFloorLayout } from "./layout.js";
import { isInsideRoom, isRoomTileAwayFromDoors } from "./spawnPool.js";

// Layout-level tests only. Per-kind spawn behavior is covered
// deterministically in floorEnemies.test.ts / floorItems.test.ts, and the
// full real-seed integration (nothing overlaps, everything on floor tiles)
// in floor.test.ts's descendStairs suite.

describe("buildFloorLayout", () => {
	it("is deterministic: the same rng state produces the same layout", () => {
		const first = buildFloorLayout(40, 20, createRng(7), 1, "down", 1, 0, true);
		const second = buildFloorLayout(
			40,
			20,
			createRng(7),
			1,
			"down",
			1,
			0,
			true,
		);
		expect(second).toEqual(first);
	});

	it("places the player and the staircase on floor tiles", () => {
		const layout = buildFloorLayout(
			40,
			20,
			createRng(7),
			1,
			"down",
			1,
			0,
			true,
		);
		expect(layout.terrain[layout.player.x]?.[layout.player.y]).toBe(0);
		expect(layout.terrain[layout.stairs.x]?.[layout.stairs.y]).toBe(0);
	});

	it("uses the requested staircase direction on a regular floor, with no amulet", () => {
		const descending = buildFloorLayout(
			40,
			20,
			createRng(7),
			2,
			"down",
			1,
			0,
			true,
		);
		expect(descending.stairs.direction).toBe("down");
		expect(descending.amulet).toBeUndefined();

		const ascending = buildFloorLayout(
			40,
			20,
			createRng(7),
			2,
			"up",
			1,
			0,
			true,
		);
		expect(ascending.stairs.direction).toBe("up");
	});

	it("forces an up staircase and spawns the amulet on GOAL_FLOOR", () => {
		const goal = buildFloorLayout(
			40,
			20,
			createRng(7),
			GOAL_FLOOR,
			"down",
			1,
			0,
			true,
		);
		expect(goal.stairs.direction).toBe("up");
		expect(goal.amulet).not.toBeUndefined();
		if (goal.amulet !== undefined) {
			expect(goal.terrain[goal.amulet.x]?.[goal.amulet.y]).toBe(0);
		}
	});

	it("places the staircase inside a room, away from doorways", () => {
		for (let seed = 1; seed <= 15; seed++) {
			const layout = buildFloorLayout(
				40,
				20,
				createRng(seed),
				2,
				"down",
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
				"down",
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
				"up",
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
				"down",
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
