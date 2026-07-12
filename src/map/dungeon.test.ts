import { describe, expect, it } from "vitest";
import { createRng } from "../rng.js";
import { createDiggerMap, type DiggerMap } from "./digger.js";
import { digCorridor, digRoom } from "./features.js";
import { createUniformMap, type UniformMap } from "./uniform.js";

const generators: [string, () => DiggerMap | UniformMap][] = [
	["Digger", () => createDiggerMap(50, 50, createRng(1234))],
	["Uniform", () => createUniformMap(50, 50, createRng(1234))],
];

describe.each(generators)("%s", (_name, createMap) => {
	const map = createMap();
	const result = map.create();
	if (result === null) throw new Error("map generation timed out unexpectedly");
	const rooms = map.getRooms();
	const corridors = map.getCorridors();

	it("generates at least one room", () => {
		expect(rooms.length).toBeGreaterThan(0);
	});

	it("gives every room at least one door", () => {
		for (const room of rooms) {
			let doorCount = 0;
			digRoom(room, (_x, _y, value) => {
				if (value === 2) doorCount++;
			});
			expect(doorCount).toBeGreaterThan(0);
		}
	});

	it("gives every room at least one wall", () => {
		for (const room of rooms) {
			let wallCount = 0;
			digRoom(room, (_x, _y, value) => {
				if (value === 1) wallCount++;
			});
			expect(wallCount).toBeGreaterThan(0);
		}
	});

	it("gives every room at least one empty cell", () => {
		for (const room of rooms) {
			let emptyCount = 0;
			digRoom(room, (_x, _y, value) => {
				if (value === 0) emptyCount++;
			});
			expect(emptyCount).toBeGreaterThan(0);
		}
	});

	it("generates at least one corridor", () => {
		expect(corridors.length).toBeGreaterThan(0);
	});

	it("gives every corridor at least one empty cell", () => {
		for (const corridor of corridors) {
			let emptyCount = 0;
			digCorridor(corridor, (_x, _y, value) => {
				if (value === 0) emptyCount++;
			});
			expect(emptyCount).toBeGreaterThan(0);
		}
	});
});
