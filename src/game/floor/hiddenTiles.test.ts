import { describe, expect, it } from "vitest";
import { encodePointKey } from "../../pointkey.js";
import { createRng } from "../../rng.js";
import { buildFloorLayout } from "./layout.js";

describe("buildFloorLayout's secret doors and passages", () => {
	it("hides none on the first floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const layout = buildFloorLayout(
				80,
				22,
				createRng(seed),
				1,
				false,
				1,
				0,
				true,
			);
			expect(layout.hiddenTiles).toEqual([]);
		}
	});

	it("hides some deep down, each one wall until found and never under anything", () => {
		let doors = 0;
		let passages = 0;
		for (let seed = 1; seed <= 20; seed++) {
			const layout = buildFloorLayout(
				80,
				22,
				createRng(seed),
				20,
				false,
				1,
				0,
				true,
			);
			const taken = new Set(
				[
					layout.player,
					layout.stairs,
					...layout.enemies,
					...layout.items,
					...layout.goldPiles,
					...layout.traps,
				].map((thing) => encodePointKey(thing.x, thing.y)),
			);
			for (const tile of layout.hiddenTiles) {
				expect(layout.terrain[tile.x]?.[tile.y]).toBe(1);
				expect(taken.has(encodePointKey(tile.x, tile.y))).toBe(false);
				if (tile.kind === "door") {
					doors++;
				} else {
					passages++;
				}
			}
		}
		/* a doorway one time in five, a corridor tile one time in forty (nine in ten deep enough) */
		expect(doors).toBeGreaterThan(5);
		expect(passages).toBeGreaterThan(5);
	});
});
