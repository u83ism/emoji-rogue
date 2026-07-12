import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { createArenaMap } from "./arena.js";
import { createCellularMap } from "./cellular.js";
import { createDividedMazeMap } from "./dividedmaze.js";
import { createEllerMazeMap } from "./ellermaze.js";
import { createIceyMazeMap } from "./iceymaze.js";
import { createRogueMap } from "./rogue.js";

const WIDTH = 20;
const HEIGHT = 20;

function collect(
	build: (callback: (x: number, y: number, value: number) => void) => void,
) {
	const cells = new Map<string, number>();
	build((x, y, value) => {
		cells.set(`${x},${y}`, value);
	});
	return cells;
}

function expectFullGridOfBinaryValues(cells: Map<string, number>) {
	expect(cells.size).toBe(WIDTH * HEIGHT);
	for (const value of cells.values()) {
		expect([0, 1]).toContain(value);
	}
}

describe("createArenaMap", () => {
	it("fills the grid with an empty room bordered by walls", () => {
		const cells = collect((callback) =>
			createArenaMap(WIDTH, HEIGHT, callback),
		);
		expectFullGridOfBinaryValues(cells);
		expect(cells.get("0,0")).toBe(1);
		expect(
			cells.get(`${Math.floor(WIDTH / 2)},${Math.floor(HEIGHT / 2)}`),
		).toBe(0);
	});
});

describe("createCellularMap", () => {
	it("randomizes, evolves, and reports a full grid", () => {
		const map = createCellularMap(WIDTH, HEIGHT);
		map.randomize(createRng(1), 0.5);
		map.create();
		const cells = collect((callback) => map.create(callback));
		expectFullGridOfBinaryValues(cells);
	});

	it("connects free space without throwing", () => {
		const map = createCellularMap(WIDTH, HEIGHT);
		map.randomize(createRng(1), 0.5);
		map.create();
		expect(() => map.connect(createRng(1), undefined, 0)).not.toThrow();
	});
});

describe("createDividedMazeMap", () => {
	it("produces a full grid of binary values", () => {
		const cells = collect((callback) =>
			createDividedMazeMap(WIDTH, HEIGHT, createRng(1), callback),
		);
		expectFullGridOfBinaryValues(cells);
	});
});

describe("createEllerMazeMap", () => {
	it("produces a full grid of binary values", () => {
		const cells = collect((callback) =>
			createEllerMazeMap(WIDTH, HEIGHT, createRng(1), callback),
		);
		expectFullGridOfBinaryValues(cells);
	});
});

describe("createIceyMazeMap", () => {
	it("produces a full grid of binary values", () => {
		const cells = collect((callback) =>
			createIceyMazeMap(WIDTH, HEIGHT, createRng(1), callback),
		);
		expectFullGridOfBinaryValues(cells);
	});
});

describe("createRogueMap", () => {
	it("produces a full grid of binary values", () => {
		const cells = collect((callback) =>
			createRogueMap(WIDTH, HEIGHT, createRng(1)).create(callback),
		);
		expectFullGridOfBinaryValues(cells);
	});
});
