import { describe, expect, it } from "vitest";
import type { ShuffleSource } from "./simplex.js";
import { createSimplexNoise } from "./simplex.js";

const identityShuffle: ShuffleSource = {
	shuffle: <T>(array: T[]) => array.slice(),
};

describe("createSimplexNoise", () => {
	it("returns a finite value for a given coordinate", () => {
		const noise = createSimplexNoise(identityShuffle);
		const value = noise(1.5, 2.5);
		expect(Number.isFinite(value)).toBe(true);
	});

	it("is deterministic for the same rng and coordinates", () => {
		const noiseA = createSimplexNoise(identityShuffle);
		const noiseB = createSimplexNoise(identityShuffle);
		expect(noiseA(3.14, 2.71)).toBe(noiseB(3.14, 2.71));
	});

	it("varies across different coordinates", () => {
		const noise = createSimplexNoise(identityShuffle);
		const values = new Set([
			noise(0, 0),
			noise(10, 0),
			noise(0, 10),
			noise(5, 5),
		]);
		expect(values.size).toBeGreaterThan(1);
	});

	it("depends on the shuffle result", () => {
		const reverseShuffle: ShuffleSource = {
			shuffle: <T>(array: T[]) => array.slice().reverse(),
		};
		const noiseA = createSimplexNoise(identityShuffle);
		const noiseB = createSimplexNoise(reverseShuffle);
		expect(noiseA(1.23, 4.56)).not.toBe(noiseB(1.23, 4.56));
	});
});
