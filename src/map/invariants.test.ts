import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { createCellularMap } from "./cellular.js";
import { createDiggerMap } from "./digger.js";
import { createDividedMazeMap } from "./dividedmaze.js";
import { createEllerMazeMap } from "./ellermaze.js";
import { createIceyMazeMap } from "./iceymaze.js";
import { createRogueMap } from "./rogue.js";
import { createUniformMap } from "./uniform.js";

/**
 * Structural invariants checked across many seeds. The per-generator specs in
 * generators.test.ts only verify that a full grid is produced; these tests
 * verify that the *content* of the grid is structurally sound, which is the
 * kind of regression a subtly broken loop condition would cause (see the
 * rogue.ts do-while note in docs/tasks/modernization.md).
 */

const WIDTH = 30;
const HEIGHT = 20;
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

type Grid = number[][];

const buildGrid = (
	build: (callback: (x: number, y: number, value: number) => void) => void,
): Grid => {
	const grid: Grid = [];
	for (let x = 0; x < WIDTH; x++) {
		grid.push(new Array<number>(HEIGHT).fill(-1));
	}
	build((x, y, value) => {
		const column = grid[x];
		if (column === undefined) throw new Error(`x out of range: ${x}`);
		column[y] = value;
	});
	return grid;
};

const cellAt = (grid: Grid, x: number, y: number): number => {
	const value = grid[x]?.[y];
	if (value === undefined) throw new Error(`cell out of range: ${x},${y}`);
	return value;
};

const expectEveryCellWritten = (grid: Grid): void => {
	for (let x = 0; x < WIDTH; x++) {
		for (let y = 0; y < HEIGHT; y++) {
			expect(cellAt(grid, x, y)).not.toBe(-1);
		}
	}
};

const expectValuesWithin = (grid: Grid, allowed: readonly number[]): void => {
	for (let x = 0; x < WIDTH; x++) {
		for (let y = 0; y < HEIGHT; y++) {
			expect(allowed).toContain(cellAt(grid, x, y));
		}
	}
};

const expectBorderIsAllWalls = (grid: Grid): void => {
	for (let x = 0; x < WIDTH; x++) {
		expect(cellAt(grid, x, 0)).toBe(1);
		expect(cellAt(grid, x, HEIGHT - 1)).toBe(1);
	}
	for (let y = 0; y < HEIGHT; y++) {
		expect(cellAt(grid, 0, y)).toBe(1);
		expect(cellAt(grid, WIDTH - 1, y)).toBe(1);
	}
};

/**
 * Every open cell must be reachable from every other open cell via
 * 4-neighbor movement ("open" = any value in openValues).
 */
const expectOpenCellsConnected = (
	grid: Grid,
	openValues: readonly number[],
): void => {
	const isOpen = (x: number, y: number): boolean =>
		x >= 0 &&
		x < WIDTH &&
		y >= 0 &&
		y < HEIGHT &&
		openValues.includes(cellAt(grid, x, y));

	let totalOpen = 0;
	let start: [number, number] | null = null;
	for (let x = 0; x < WIDTH; x++) {
		for (let y = 0; y < HEIGHT; y++) {
			if (isOpen(x, y)) {
				totalOpen++;
				start = start ?? [x, y];
			}
		}
	}
	expect(totalOpen).toBeGreaterThan(0);
	if (start === null) throw new Error("unreachable: totalOpen > 0");

	const visited = new Set<string>([`${start[0]},${start[1]}`]);
	const queue: [number, number][] = [start];
	while (queue.length > 0) {
		const point = queue.shift();
		if (point === undefined) throw new Error("unreachable: queue non-empty");
		const [x, y] = point;
		for (const [dx, dy] of [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		] as const) {
			const nx = x + dx;
			const ny = y + dy;
			const key = `${nx},${ny}`;
			if (isOpen(nx, ny) && !visited.has(key)) {
				visited.add(key);
				queue.push([nx, ny]);
			}
		}
	}

	expect(visited.size).toBe(totalOpen);
};

describe("createDiggerMap invariants", () => {
	it.each(SEEDS)("seed %i: connected floor inside a walled border", (seed) => {
		const grid = buildGrid((callback) =>
			createDiggerMap(WIDTH, HEIGHT, createRng(seed)).create(callback),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
		expectBorderIsAllWalls(grid);
		expectOpenCellsConnected(grid, [0]);
	});

	it("is deterministic for the same seed", () => {
		const gridA = buildGrid((callback) =>
			createDiggerMap(WIDTH, HEIGHT, createRng(42)).create(callback),
		);
		const gridB = buildGrid((callback) =>
			createDiggerMap(WIDTH, HEIGHT, createRng(42)).create(callback),
		);
		expect(gridA).toEqual(gridB);
	});
});

describe("createUniformMap invariants", () => {
	it.each(SEEDS)("seed %i: rooms and corridors all connected", (seed) => {
		const grid = buildGrid((callback) => {
			const result = createUniformMap(WIDTH, HEIGHT, createRng(seed)).create(
				callback,
			);
			expect(result.ok).toBe(true);
		});
		expectEveryCellWritten(grid);
		/* 0 = dug, 1 = wall, 2 = door */
		expectValuesWithin(grid, [0, 1, 2]);
		expectOpenCellsConnected(grid, [0, 2]);
	});

	it("is deterministic for the same seed", () => {
		const gridA = buildGrid((callback) => {
			createUniformMap(WIDTH, HEIGHT, createRng(42)).create(callback);
		});
		const gridB = buildGrid((callback) => {
			createUniformMap(WIDTH, HEIGHT, createRng(42)).create(callback);
		});
		expect(gridA).toEqual(gridB);
	});
});

describe("createRogueMap invariants", () => {
	/*
	 * No connectivity assertion: the original algorithm's
	 * connectUnconnectedRooms can silently give up on a room, so full
	 * connectivity is not guaranteed by construction.
	 */
	it.each(SEEDS)("seed %i: full binary grid", (seed) => {
		const grid = buildGrid((callback) =>
			createRogueMap(WIDTH, HEIGHT, createRng(seed)).create(callback),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
	});

	it("is deterministic for the same seed", () => {
		const gridA = buildGrid((callback) =>
			createRogueMap(WIDTH, HEIGHT, createRng(42)).create(callback),
		);
		const gridB = buildGrid((callback) =>
			createRogueMap(WIDTH, HEIGHT, createRng(42)).create(callback),
		);
		expect(gridA).toEqual(gridB);
	});
});

describe("maze generator invariants", () => {
	it.each(
		SEEDS,
	)("seed %i: eller maze is connected inside a walled border", (seed) => {
		const grid = buildGrid((callback) =>
			createEllerMazeMap(WIDTH, HEIGHT, createRng(seed), callback),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
		expectBorderIsAllWalls(grid);
		expectOpenCellsConnected(grid, [0]);
	});

	it.each(
		SEEDS,
	)("seed %i: divided maze is connected inside a walled border", (seed) => {
		const grid = buildGrid((callback) =>
			createDividedMazeMap(WIDTH, HEIGHT, createRng(seed), callback),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
		expectBorderIsAllWalls(grid);
		expectOpenCellsConnected(grid, [0]);
	});

	it.each(
		SEEDS,
	)("seed %i: icey maze is connected inside a walled border", (seed) => {
		const grid = buildGrid((callback) =>
			createIceyMazeMap(WIDTH, HEIGHT, createRng(seed), callback),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
		expectBorderIsAllWalls(grid);
		expectOpenCellsConnected(grid, [0]);
	});
});

describe("createCellularMap invariants", () => {
	it.each(
		SEEDS,
	)("seed %i: connect() makes all free space reachable", (seed) => {
		const map = createCellularMap(WIDTH, HEIGHT);
		map.randomize(createRng(seed), 0.5);
		map.create();
		map.create();
		const grid = buildGrid((callback) =>
			map.connect(createRng(seed), callback, 0),
		);
		expectEveryCellWritten(grid);
		expectValuesWithin(grid, [0, 1]);
		expectOpenCellsConnected(grid, [0]);
	});
});
