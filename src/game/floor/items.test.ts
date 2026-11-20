import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import { ITEM_DRAW_ATTEMPTS_PER_FLOOR } from "../balance.js";
import type { Position } from "../state.js";
import { drawFloorItems } from "./items.js";
import { ITEM_KIND_WEIGHTS } from "./spawnTable.js";

// Scripted rngs: every roll either always lands (the lower bound) or never
// does (the upper bound), so no test hunts for seeds.

/** Every roll lands: getUniformInt returns its lower bound (0 < any chance, the first table entry). */
const createAlwaysHitRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll misses: getUniformInt returns its upper bound (99 is no chance). */
const createAlwaysMissRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

/** Deep enough that the always-hit rng's trap roll (`rnd(10) < floor`) lands. */
const DEEP_FLOOR = 12;

const buildPool = (size: number): Position[] =>
	Array.from({ length: size }, (_, index) => ({ x: index, y: 0 }));

describe("drawFloorItems", () => {
	it("makes ITEM_DRAW_ATTEMPTS_PER_FLOOR items when every 36% roll lands — the first category's first kind", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			DEEP_FLOOR,
			() => true,
			1,
			0,
			true,
		);
		expect(drawn.items).toHaveLength(ITEM_DRAW_ATTEMPTS_PER_FLOOR);
		expect(drawn.items.every((item) => item.kind === "confusion")).toBe(true);
		/* no food this floor: the drought counter goes up by one */
		expect(drawn.floorsWithoutFood).toBe(1);
	});

	it("makes nothing — not even a healing potion — when every roll misses", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysMissRng(),
			DEEP_FLOOR,
			() => true,
			1,
			0,
			true,
		);
		expect(drawn.items).toEqual([]);
	});

	it("after more than 3 floors without food, the next item is food for sure, and the counter resets", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			DEEP_FLOOR,
			() => true,
			1,
			3,
			true,
		);
		expect(drawn.items[0]?.kind).toBe("food");
		expect(drawn.items.slice(1).every((item) => item.kind !== "food")).toBe(
			true,
		);
		expect(drawn.floorsWithoutFood).toBe(0);
	});

	it("climbing back with the amulet places no items, but the drought still counts", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			DEEP_FLOOR,
			() => true,
			1,
			0,
			false,
		);
		expect(drawn.items).toEqual([]);
		expect(drawn.floorsWithoutFood).toBe(1);
	});

	it("over many floors, the categories come out at about original Rogue's weights", () => {
		const rng = createRng(7);
		const counts = new Map<string, number>();
		let total = 0;
		for (let floor = 0; floor < 600; floor++) {
			const drawn = drawFloorItems(
				buildPool(100),
				rng,
				DEEP_FLOOR,
				() => true,
				1,
				0,
				true,
			);
			for (const item of drawn.items) {
				const category = Object.entries(ITEM_KIND_WEIGHTS).find(([, kinds]) =>
					kinds.some((entry) => entry.kind === item.kind),
				)?.[0];
				counts.set(category ?? "?", (counts.get(category ?? "?") ?? 0) + 1);
				total += 1;
			}
		}
		/* 9 attempts x 36% = 3.24 items a floor */
		expect(total / 600).toBeGreaterThan(3);
		expect(total / 600).toBeLessThan(3.5);
		expect((counts.get("scroll") ?? 0) / total).toBeCloseTo(0.36, 1);
		expect((counts.get("potion") ?? 0) / total).toBeCloseTo(0.26, 1);
	});

	it("draws a floor's worth of traps too, leaving their rules to drawFloorTraps (see traps.test.ts)", () => {
		const drawn = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			DEEP_FLOOR,
			() => true,
			1,
			0,
			true,
		);
		expect(drawn.traps.length).toBeGreaterThanOrEqual(1);
		const none = drawFloorItems(
			buildPool(100),
			createAlwaysHitRng(),
			DEEP_FLOOR,
			() => false,
			1,
			0,
			true,
		);
		expect(none.traps.length).toBe(0);
		expect(none.items.length).toBeGreaterThan(0);
	});
});
