import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import { MAX_TRAPS_PER_FLOOR } from "../balance.js";
import { TRAP_KIND_VALUES } from "../events.js";
import type { Position } from "../state.js";
import { drawFloorTraps } from "./traps.js";

/** Every roll lands: getUniformInt returns its lower bound. */
const createAlwaysLowRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll is as high as it goes. */
const createAlwaysHighRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

const buildPool = (size: number): Position[] =>
	Array.from({ length: size }, (_, index) => ({ x: index, y: 0 }));

describe("drawFloorTraps", () => {
	it("floor N has an N-in-10 chance of traps — none at all on a failed roll", () => {
		/* rnd(10) at its highest, 9, is not below floor 9 */
		expect(
			drawFloorTraps(buildPool(100), createAlwaysHighRng(), 9, () => true),
		).toEqual([]);
		/* but floor 10 always has some */
		expect(
			drawFloorTraps(buildPool(100), createAlwaysHighRng(), 10, () => true)
				.length,
		).toBeGreaterThan(0);
	});

	it("places rnd(floor / 4) + 1 traps, at most MAX_TRAPS_PER_FLOOR, all hidden", () => {
		const fewest = drawFloorTraps(
			buildPool(100),
			createAlwaysLowRng(),
			8,
			() => true,
		);
		expect(fewest).toHaveLength(1);
		expect(fewest.every((trap) => !trap.seen)).toBe(true);
		/* floor 12, every roll high: rnd(3) = 2, so 3 traps */
		const most = drawFloorTraps(
			buildPool(100),
			createAlwaysHighRng(),
			12,
			() => true,
		);
		expect(most).toHaveLength(3);
		const deep = drawFloorTraps(
			buildPool(100),
			createAlwaysHighRng(),
			80,
			() => true,
		);
		expect(deep).toHaveLength(MAX_TRAPS_PER_FLOOR);
	});

	it("over many floors, every one of the eight kinds turns up", () => {
		const rng = createRng(3);
		const seen = new Set<string>();
		for (let attempt = 0; attempt < 200; attempt++) {
			for (const trap of drawFloorTraps(buildPool(100), rng, 20, () => true)) {
				seen.add(trap.kind);
			}
		}
		expect([...seen].sort()).toEqual([...TRAP_KIND_VALUES].sort());
	});

	it("lands traps only on eligible tiles and skips them when none qualify", () => {
		const restricted = drawFloorTraps(
			buildPool(100),
			createRng(5),
			40,
			(position) => position.x >= 50,
		);
		for (const trap of restricted) {
			expect(trap.x).toBeGreaterThanOrEqual(50);
		}
		expect(
			drawFloorTraps(buildPool(100), createAlwaysHighRng(), 40, () => false),
		).toEqual([]);
	});
});
