import { describe, expect, it } from "vitest";
import type { Color } from "./color.js";
import {
	add,
	add_,
	fromString,
	hsl2rgb,
	interpolate,
	interpolateHSL,
	multiply,
	multiply_,
	randomize,
	rgb2hsl,
	toHex,
	toRGB,
} from "./color.js";
import { createRng } from "./rng.js";

describe("add", () => {
	it("adds two colors", () => {
		expect(add([1, 2, 3], [3, 4, 5])).toEqual([4, 6, 8]);
	});
	it("adds three colors", () => {
		expect(add([1, 2, 3], [3, 4, 5], [100, 200, 300])).toEqual([104, 206, 308]);
	});
	it("adds one color (noop)", () => {
		expect(add([1, 2, 3])).toEqual([1, 2, 3]);
	});
	it("does not modify the first argument", () => {
		const c1: Color = [1, 2, 3];
		add(c1, [3, 4, 5]);
		expect(c1).toEqual([1, 2, 3]);
	});
});

describe("add_", () => {
	it("adds two colors", () => {
		expect(add_([1, 2, 3], [3, 4, 5])).toEqual([4, 6, 8]);
	});
	it("modifies and returns the first argument", () => {
		const c1: Color = [1, 2, 3];
		const c3 = add_(c1, [3, 4, 5]);
		expect(c1).toEqual([4, 6, 8]);
		expect(c1).toBe(c3);
	});
});

describe("multiply", () => {
	it("multiplies two colors", () => {
		expect(multiply([100, 200, 300], [51, 51, 51])).toEqual([20, 40, 60]);
	});
	it("multiplies three colors", () => {
		expect(multiply([100, 200, 300], [51, 51, 51], [510, 510, 510])).toEqual([
			40, 80, 120,
		]);
	});
	it("does not modify the first argument", () => {
		const c1: Color = [1, 2, 3];
		multiply(c1, [3, 4, 5]);
		expect(c1).toEqual([1, 2, 3]);
	});
	it("rounds the result", () => {
		expect(multiply([100, 200, 300], [10, 10, 10])).toEqual([4, 8, 12]);
	});
});

describe("multiply_", () => {
	it("modifies and returns the first argument", () => {
		const c1: Color = [100, 200, 300];
		const c3 = multiply_(c1, [51, 51, 51]);
		expect(c1).toEqual([20, 40, 60]);
		expect(c1).toBe(c3);
	});
});

describe("fromString", () => {
	it("handles rgb() colors", () => {
		expect(fromString("rgb(10, 20, 33)")).toEqual([10, 20, 33]);
	});
	it("handles #abcdef colors", () => {
		expect(fromString("#1a2f3c")).toEqual([26, 47, 60]);
	});
	it("handles #abc colors", () => {
		expect(fromString("#ca8")).toEqual([204, 170, 136]);
	});
	it("handles named colors", () => {
		expect(fromString("red")).toEqual([255, 0, 0]);
	});
	it("falls back to black for unknown names", () => {
		expect(fromString("lol")).toEqual([0, 0, 0]);
	});
});

describe("toRGB", () => {
	it("serializes to an rgb() string", () => {
		expect(toRGB([10, 20, 30])).toBe("rgb(10,20,30)");
	});
	it("clamps values to 0..255", () => {
		expect(toRGB([-100, 20, 2000])).toBe("rgb(0,20,255)");
	});
});

describe("toHex", () => {
	it("serializes to hex", () => {
		expect(toHex([10, 20, 40])).toBe("#0a1428");
	});
	it("clamps values to 0..255", () => {
		expect(toHex([-100, 20, 2000])).toBe("#0014ff");
	});
});

describe("interpolate", () => {
	it("interpolates two colors", () => {
		expect(interpolate([10, 20, 40], [100, 200, 300], 0.1)).toEqual([
			19, 38, 66,
		]);
	});
	it("rounds the result", () => {
		expect(interpolate([10, 20, 40], [15, 30, 53], 0.5)).toEqual([13, 25, 47]);
	});
	it("defaults to a 0.5 factor", () => {
		expect(interpolate([10, 20, 40], [20, 30, 40])).toEqual([15, 25, 40]);
	});
});

describe("interpolateHSL", () => {
	it("interpolates two colors", () => {
		expect(interpolateHSL([10, 20, 40], [100, 200, 300], 0.1)).toEqual([
			12, 33, 73,
		]);
	});
});

describe("randomize", () => {
	it("keeps a constant diff across channels when given a single number", () => {
		const color = randomize(createRng(1), [100, 100, 100], 100);
		expect(color[0]).toBe(color[1]);
		expect(color[1]).toBe(color[2]);
	});
});

describe("rgb2hsl and hsl2rgb", () => {
	it("round-trips through HSL and back", () => {
		const colors: Color[] = [
			[255, 255, 255],
			[0, 0, 0],
			[255, 0, 0],
			[30, 30, 30],
			[100, 120, 140],
		];
		for (const color of colors) {
			expect(hsl2rgb(rgb2hsl(color))).toEqual(color);
		}
	});

	it("rounds converted values", () => {
		const rgb = hsl2rgb([0.5, 0, 0.3]);
		for (const channel of rgb) {
			expect(Math.round(channel)).toBe(channel);
		}
	});
});
