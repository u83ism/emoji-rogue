import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import { TRAP_COUNT_PER_FLOOR } from "../balance.js";
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
	it("with every roll hitting, spawns dart traps plus one each of trapdoor, teleport, bear, rust, and sleeping-gas", () => {
		const traps = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			() => true,
		);
		expect(traps.filter((trap) => trap.kind === "dart").length).toBe(
			TRAP_COUNT_PER_FLOOR,
		);
		expect(traps.filter((trap) => trap.kind === "trapdoor").length).toBe(1);
		expect(traps.filter((trap) => trap.kind === "teleport").length).toBe(1);
		expect(traps.filter((trap) => trap.kind === "bear").length).toBe(1);
		expect(traps.filter((trap) => trap.kind === "rust").length).toBe(1);
		expect(traps.filter((trap) => trap.kind === "sleeping-gas").length).toBe(1);
	});

	it("with every roll missing, spawns only the guaranteed dart traps", () => {
		const traps = drawFloorTraps(
			buildPool(100),
			createAlwaysMissRng(),
			() => true,
		);
		expect(traps.length).toBe(TRAP_COUNT_PER_FLOOR);
		expect(traps.every((trap) => trap.kind === "dart")).toBe(true);
	});

	it("lands traps only on eligible tiles and skips them when none qualify", () => {
		const restricted = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			(position) => position.x >= 50,
		);
		expect(restricted.length).toBeGreaterThan(0);
		for (const trap of restricted) {
			expect(trap.x).toBeGreaterThanOrEqual(50);
		}

		const none = drawFloorTraps(
			buildPool(100),
			createAlwaysHitRng(),
			() => false,
		);
		expect(none.length).toBe(0);
	});
});
