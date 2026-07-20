import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import { GOAL_FLOOR, TRAP_COUNT_PER_FLOOR } from "../balance.js";
import type { Position } from "../state.js";
import { drawFloorTraps } from "./traps.js";

// Same scripted-rng idiom as items.test.ts: no seed hunting, every percent
// roll either always hits or always misses.

/** Every roll lands: getUniformInt returns its lower bound (0 < any chance). */
const createAlwaysHitRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll misses: getUniformInt returns its upper bound (99 < no chance). */
const createAlwaysMissRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

const buildPool = (size: number): Position[] =>
	Array.from({ length: size }, (_, index) => ({ x: index, y: 0 }));

describe("drawFloorTraps", () => {
	it("with every roll hitting, spawns dart traps plus one trapdoor and one teleport trap", () => {
		const traps = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			1,
			() => true,
		);
		expect(traps.filter((trap) => trap.kind === "dart").length).toBe(
			TRAP_COUNT_PER_FLOOR,
		);
		expect(traps.filter((trap) => trap.kind === "trapdoor").length).toBe(1);
		expect(traps.filter((trap) => trap.kind === "teleport").length).toBe(1);
	});

	it("with every roll missing, spawns only the guaranteed dart traps", () => {
		const traps = drawFloorTraps(
			buildPool(100),
			createAlwaysMissRng(),
			1,
			() => true,
		);
		expect(traps.length).toBe(TRAP_COUNT_PER_FLOOR);
		expect(traps.every((trap) => trap.kind === "dart")).toBe(true);
	});

	it("never spawns a trapdoor on GOAL_FLOOR, even when its roll would hit", () => {
		const traps = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			GOAL_FLOOR,
			() => true,
		);
		expect(traps.some((trap) => trap.kind === "trapdoor")).toBe(false);
		/* the teleport trap is still allowed there — it stays within the floor */
		expect(traps.some((trap) => trap.kind === "teleport")).toBe(true);
	});

	it("lands traps only on eligible tiles and skips them when none qualify", () => {
		const restricted = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			1,
			(position) => position.x >= 50,
		);
		expect(restricted.length).toBeGreaterThan(0);
		for (const trap of restricted) {
			expect(trap.x).toBeGreaterThanOrEqual(50);
		}

		const none = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			1,
			() => false,
		);
		expect(none.length).toBe(0);
	});
});
