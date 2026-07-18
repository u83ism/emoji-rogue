import { describe, expect, it } from "vitest";
import { createDiscreteShadowcastingFov } from "./discrete-shadowcasting.js";
import type { Fov, LightPassesCallback, VisibilityCallback } from "./fov.js";
import { createPreciseShadowcastingFov } from "./precise-shadowcasting.js";
import { createRecursiveShadowcastingFov } from "./recursive-shadowcasting.js";

const MAP8_RING0 = ["#####", "#####", "##@##", "#####", "#####"];
const RESULT_MAP8_RING0 = ["     ", " ... ", " ... ", " ... ", "     "];
const RESULT_MAP8_RING0_90_NORTH = [
	"     ",
	" ... ",
	"  .  ",
	"     ",
	"     ",
];
const RESULT_MAP8_RING0_90_SOUTH = [
	"     ",
	"     ",
	"  .  ",
	" ... ",
	"     ",
];
const RESULT_MAP8_RING0_90_EAST = ["     ", "   . ", "  .. ", "   . ", "     "];
const RESULT_MAP8_RING0_90_WEST = ["     ", " .   ", " ..  ", " .   ", "     "];
const RESULT_MAP8_RING0_180_NORTH = [
	"     ",
	" ... ",
	" ... ",
	"     ",
	"     ",
];
const RESULT_MAP8_RING0_180_SOUTH = [
	"     ",
	"     ",
	" ... ",
	" ... ",
	"     ",
];
const RESULT_MAP8_RING0_180_EAST = [
	"     ",
	"  .. ",
	"  .. ",
	"  .. ",
	"     ",
];
const RESULT_MAP8_RING0_180_WEST = [
	"     ",
	" ..  ",
	" ..  ",
	" ..  ",
	"     ",
];

const MAP8_RING1 = ["#####", "#...#", "#.@.#", "#...#", "#####"];
const RESULT_MAP8_RING1 = [".....", ".....", ".....", ".....", "....."];

interface LightCallbackWithCenter extends LightPassesCallback {
	center: [number, number];
}

const buildLightCallback = (
	map: readonly string[],
): LightCallbackWithCenter => {
	let center: [number, number] = [0, 0];
	for (let j = 0; j < map.length; j++) {
		const row = map[j];
		if (row === undefined) continue;
		for (let i = 0; i < row.length; i++) {
			if (row.charAt(i) === "@") {
				center = [i, j];
			}
		}
	}

	const result = ((x: number, y: number) => {
		const row = map[y];
		if (row === undefined) return false;
		return row.charAt(x) !== "#";
	}) as LightCallbackWithCenter;
	result.center = center;
	return result;
};

const checkResult = (
	compute: (
		x: number,
		y: number,
		radius: number,
		callback: VisibilityCallback,
	) => void,
	center: [number, number],
	result: readonly string[],
): void => {
	const used = new Set<string>();
	const callback: VisibilityCallback = (x, y) => {
		const row = result[y];
		expect(row?.charAt(x)).toBe(".");
		used.add(`${x},${y}`);
	};

	compute(center[0], center[1], 2, callback);
	for (let j = 0; j < result.length; j++) {
		const row = result[j];
		if (row === undefined) continue;
		for (let i = 0; i < row.length; i++) {
			if (row.charAt(i) !== ".") continue;
			expect(used.has(`${i},${j}`)).toBe(true);
		}
	}
};

describe("Discrete Shadowcasting", () => {
	it("computes visible ring0", () => {
		const lightPasses = buildLightCallback(MAP8_RING0);
		const fov = createDiscreteShadowcastingFov(lightPasses, { topology: 8 });
		checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
	});

	it("computes visible ring1", () => {
		const lightPasses = buildLightCallback(MAP8_RING1);
		const fov = createDiscreteShadowcastingFov(lightPasses, { topology: 8 });
		checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
	});
});

describe("Precise Shadowcasting", () => {
	it("computes visible ring0", () => {
		const lightPasses = buildLightCallback(MAP8_RING0);
		const fov = createPreciseShadowcastingFov(lightPasses, { topology: 8 });
		checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
	});

	it("computes visible ring1", () => {
		const lightPasses = buildLightCallback(MAP8_RING1);
		const fov = createPreciseShadowcastingFov(lightPasses, { topology: 8 });
		checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
	});
});

describe("Recursive Shadowcasting", () => {
	let fov: Fov;

	describe("360-degree view", () => {
		it("computes visible ring0", () => {
			const lightPasses = buildLightCallback(MAP8_RING0);
			fov = createRecursiveShadowcastingFov(lightPasses).compute;
			checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
		});

		it("computes visible ring1", () => {
			const lightPasses = buildLightCallback(MAP8_RING1);
			fov = createRecursiveShadowcastingFov(lightPasses).compute;
			checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
		});
	});

	describe("180-degree view", () => {
		it.each([
			["north", 0, RESULT_MAP8_RING0_180_NORTH],
			["south", 4, RESULT_MAP8_RING0_180_SOUTH],
			["east", 2, RESULT_MAP8_RING0_180_EAST],
			["west", 6, RESULT_MAP8_RING0_180_WEST],
		] as const)("computes visible ring0 facing %s (dir %i)", (_direction, dir, expected) => {
			const lightPasses = buildLightCallback(MAP8_RING0);
			const recursive = createRecursiveShadowcastingFov(lightPasses);
			checkResult(
				(x, y, radius, callback) =>
					recursive.compute180(x, y, radius, dir, callback),
				lightPasses.center,
				expected,
			);
		});
	});

	describe("90-degree view", () => {
		it.each([
			["north", 0, RESULT_MAP8_RING0_90_NORTH],
			["south", 4, RESULT_MAP8_RING0_90_SOUTH],
			["east", 2, RESULT_MAP8_RING0_90_EAST],
			["west", 6, RESULT_MAP8_RING0_90_WEST],
		] as const)("computes visible ring0 facing %s (dir %i)", (_direction, dir, expected) => {
			const lightPasses = buildLightCallback(MAP8_RING0);
			const recursive = createRecursiveShadowcastingFov(lightPasses);
			checkResult(
				(x, y, radius, callback) =>
					recursive.compute90(x, y, radius, dir, callback),
				lightPasses.center,
				expected,
			);
		});
	});
});
