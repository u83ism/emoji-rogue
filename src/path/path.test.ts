import { beforeEach, describe, expect, it } from "vitest";
import { createAStarPath } from "./astar.js";
import { createDijkstraPath } from "./dijkstra.js";
import type { PassableCallback } from "./path.js";

/**
 * ........
 * A###.###
 * ..B#.#X#
 * .###.###
 * ....Z...
 */
// biome-ignore format: visually aligned map data
const MAP48 = [
	/* transposed */ [0, 0, 0, 0, 0],
	[0, 1, 0, 1, 0],
	[0, 1, 0, 1, 0],
	[0, 1, 1, 1, 0],
	[0, 0, 0, 0, 0],
	[0, 1, 1, 1, 0],
	[0, 1, 0, 1, 0],
	[0, 1, 1, 1, 0],
];

const PASSABLE_CALLBACK_48: PassableCallback = (x, y) => {
	const column = MAP48[x];
	if (
		x < 0 ||
		y < 0 ||
		x >= MAP48.length ||
		column === undefined ||
		y >= column.length
	) {
		return false;
	}
	return column[y] === 0;
};

const A: [number, number] = [0, 1];
const B: [number, number] = [2, 2];
const Z: [number, number] = [4, 4];
const X: [number, number] = [6, 2];

let path: number[] = [];
const PATH_CALLBACK = (x: number, y: number) => {
	path.push(x, y);
};

/*
 * . . A # . B
 *  . # # . .
 * . . # . . .
 *  # . . # .
 * X # # # Z .
 */
// biome-ignore format: visually aligned map data
const MAP6 = [
	/* transposed */ [0, null, 0, null, 0],
	[null, 0, null, 1, null],
	[0, null, 0, null, 1],
	[null, 1, null, 0, null],
	[0, null, 1, null, 1],
	[null, 1, null, 0, null],
	[1, null, 0, null, 1],
	[null, 0, null, 1, null],
	[0, null, 0, null, 0],
	[null, 0, null, 0, null],
	[0, null, 0, null, 0],
];

const A6: [number, number] = [4, 0];
const B6: [number, number] = [10, 0];
const Z6: [number, number] = [8, 4];
const X6: [number, number] = [0, 4];

const PASSABLE_CALLBACK_6: PassableCallback = (x, y) => {
	const column = MAP6[x];
	if (
		x < 0 ||
		y < 0 ||
		x >= MAP6.length ||
		column === undefined ||
		y >= column.length
	) {
		return false;
	}
	return column[y] === 0;
};

let visits = 0;
const PASSABLE_CALLBACK_VISIT: PassableCallback = () => {
	visits++;
	return true;
};

beforeEach(() => {
	path = [];
	visits = 0;
});

describe("Dijkstra", () => {
	describe("8-topology", () => {
		const PATH_A = [0, 1, 0, 2, 0, 3, 1, 4, 2, 4, 3, 4, 4, 4];
		const PATH_B = [2, 2, 1, 2, 0, 3, 1, 4, 2, 4, 3, 4, 4, 4];
		const dijkstra = createDijkstraPath(Z[0], Z[1], PASSABLE_CALLBACK_48, {
			topology: 8,
		});

		it("computes the correct path A", () => {
			dijkstra(A[0], A[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			dijkstra(B[0], B[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			dijkstra(X[0], X[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});
	});

	describe("4-topology", () => {
		const PATH_A = [0, 1, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 4, 4, 4];
		const PATH_B = [2, 2, 1, 2, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 4, 4, 4];
		const dijkstra = createDijkstraPath(Z[0], Z[1], PASSABLE_CALLBACK_48, {
			topology: 4,
		});

		it("computes the correct path A", () => {
			dijkstra(A[0], A[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			dijkstra(B[0], B[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			dijkstra(X[0], X[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});
	});

	describe("6-topology", () => {
		const PATH_A = [4, 0, 2, 0, 1, 1, 2, 2, 3, 3, 5, 3, 6, 2, 8, 2, 9, 3, 8, 4];
		const PATH_B = [10, 0, 9, 1, 8, 2, 9, 3, 8, 4];
		const dijkstra = createDijkstraPath(Z6[0], Z6[1], PASSABLE_CALLBACK_6, {
			topology: 6,
		});

		it("computes the correct path A", () => {
			dijkstra(A6[0], A6[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			dijkstra(B6[0], B6[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			dijkstra(X6[0], X6[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});
	});
});

describe("A*", () => {
	describe("8-topology", () => {
		const PATH_A = [0, 1, 0, 2, 0, 3, 1, 4, 2, 4, 3, 4, 4, 4];
		const PATH_B = [2, 2, 1, 2, 0, 3, 1, 4, 2, 4, 3, 4, 4, 4];
		const astar = createAStarPath(Z[0], Z[1], PASSABLE_CALLBACK_48, {
			topology: 8,
		});

		it("computes the correct path A", () => {
			astar(A[0], A[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			astar(B[0], B[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			astar(X[0], X[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});

		it("computes a path efficiently", () => {
			const openAstar = createAStarPath(0, 0, PASSABLE_CALLBACK_VISIT);
			openAstar(50, 0, PATH_CALLBACK);
			expect(visits).toBe(400);
		});
	});

	describe("4-topology", () => {
		const PATH_A = [0, 1, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 4, 4, 4];
		const PATH_B = [2, 2, 1, 2, 0, 2, 0, 3, 0, 4, 1, 4, 2, 4, 3, 4, 4, 4];
		const astar = createAStarPath(Z[0], Z[1], PASSABLE_CALLBACK_48, {
			topology: 4,
		});

		it("computes the correct path A", () => {
			astar(A[0], A[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			astar(B[0], B[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			astar(X[0], X[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});
	});

	describe("6-topology", () => {
		const PATH_A = [4, 0, 2, 0, 1, 1, 2, 2, 3, 3, 5, 3, 6, 2, 8, 2, 9, 3, 8, 4];
		const PATH_B = [10, 0, 9, 1, 8, 2, 9, 3, 8, 4];
		const astar = createAStarPath(Z6[0], Z6[1], PASSABLE_CALLBACK_6, {
			topology: 6,
		});

		it("computes the correct path A", () => {
			astar(A6[0], A6[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_A);
		});

		it("computes the correct path B", () => {
			astar(B6[0], B6[1], PATH_CALLBACK);
			expect(path).toEqual(PATH_B);
		});

		it("survives a non-existent path", () => {
			astar(X6[0], X6[1], PATH_CALLBACK);
			expect(path.length).toBe(0);
		});
	});
});
