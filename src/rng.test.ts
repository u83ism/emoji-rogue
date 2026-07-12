import { describe, expect, it } from "vitest";
import { createRng, seedToState, stepUniform } from "./rng.js";

describe("stepUniform (pure)", () => {
	it("does not mutate its input state", () => {
		const state = seedToState(12345);
		const before = { ...state };
		stepUniform(state);
		expect(state).toEqual(before);
	});

	it("returns the same value and next state for the same input state", () => {
		const state = seedToState(12345);
		const stepA = stepUniform(state);
		const stepB = stepUniform(state);
		expect(stepA).toEqual(stepB);
	});
});

describe("createRng: getUniform", () => {
	it("returns a number in [0, 1)", () => {
		const rng = createRng(1);
		const value = rng.getUniform();
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThan(1);
	});

	it("returns a precomputed value for a known seed", () => {
		const rng = createRng(12345);
		expect(rng.getUniform()).toBe(0.01198604702949524);
	});

	it("two independent instances with the same seed produce identical sequences", () => {
		const rngA = createRng(42);
		const rngB = createRng(42);
		const sequenceA = Array.from({ length: 20 }, () => rngA.getUniform());
		const sequenceB = Array.from({ length: 20 }, () => rngB.getUniform());
		expect(sequenceA).toEqual(sequenceB);
	});

	it("advancing one instance does not affect an independent instance", () => {
		const rngA = createRng(7);
		const rngB = createRng(7);
		rngA.getUniform();
		rngA.getUniform();
		// rngB has not been advanced, so its first value equals rngA's first value
		const first = createRng(7).getUniform();
		expect(rngB.getUniform()).toBe(first);
	});
});

describe("createRng: getUniformInt", () => {
	it("returns a value within the requested range regardless of argument order", () => {
		const rng = createRng(999);
		const value = rng.getUniformInt(5, 10);
		expect(value).toBeGreaterThanOrEqual(5);
		expect(value).toBeLessThanOrEqual(10);
	});

	it("does not care which bound is passed first", () => {
		const seed = 123456;
		const val1 = createRng(seed).getUniformInt(5, 10);
		const val2 = createRng(seed).getUniformInt(10, 5);
		expect(val1).toBe(val2);
	});
});

describe("createRng: seeding", () => {
	it("returns the seed via getSeed", () => {
		expect(createRng(555).getSeed()).toBe(555);
	});

	it("setSeed resets the stream", () => {
		const rng = createRng(1);
		const seed = 987654;
		rng.setSeed(seed);
		const val1 = rng.getUniform();
		rng.setSeed(seed);
		const val2 = rng.getUniform();
		expect(val1).toBe(val2);
	});
});

describe("createRng: state manipulation", () => {
	it("returns identical values after restoring an identical state", () => {
		const rng = createRng(3);
		rng.getUniform();
		const state = rng.getState();
		const val1 = rng.getUniform();
		rng.setState(state);
		const val2 = rng.getUniform();
		expect(val1).toBe(val2);
	});
});

describe("createRng: clone", () => {
	it("clones a working RNG that continues from the same state", () => {
		const rng = createRng(9);
		rng.getUniform();
		const clone = rng.clone();
		expect(rng.getUniform()).toBe(clone.getUniform());
	});

	it("advancing the clone does not affect the original", () => {
		const rng = createRng(9);
		const clone = rng.clone();
		clone.getUniform();
		const expected = createRng(9).getUniform();
		expect(rng.getUniform()).toBe(expected);
	});
});

describe("createRng: getItem", () => {
	it("returns null for an empty array", () => {
		expect(createRng(1).getItem([])).toBeNull();
	});

	it("returns an element from the array", () => {
		const array = ["a", "b", "c"];
		expect(array).toContain(createRng(1).getItem(array));
	});
});

describe("createRng: shuffle", () => {
	it("returns an array with the same elements", () => {
		const array = [1, 2, 3, 4, 5];
		const shuffled = createRng(1).shuffle(array);
		expect(shuffled.slice().sort()).toEqual(array.slice().sort());
	});

	it("does not mutate the input array", () => {
		const array = [1, 2, 3];
		const original = array.slice();
		createRng(1).shuffle(array);
		expect(array).toEqual(original);
	});
});

describe("createRng: getWeightedValue", () => {
	it("throws for an empty data object", () => {
		expect(() => createRng(1).getWeightedValue({})).toThrow();
	});

	it("only ever picks keys with non-zero weight", () => {
		const rng = createRng(1);
		for (let i = 0; i < 20; i++) {
			expect(rng.getWeightedValue({ a: 1, b: 0 })).toBe("a");
		}
	});

	it("picks the single available key", () => {
		expect(createRng(1).getWeightedValue({ only: 5 })).toBe("only");
	});
});
