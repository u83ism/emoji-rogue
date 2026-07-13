import { describe, expect, it } from "vitest";
import { buildEmptyColumns, buildUnexploredColumns } from "./columns.js";

describe("column builders", () => {
	it("buildEmptyColumns creates one empty column per x", () => {
		const columns = buildEmptyColumns(3);
		expect(columns).toEqual([[], [], []]);
	});

	it("buildUnexploredColumns creates a width×height all-false grid", () => {
		const columns = buildUnexploredColumns(2, 3);
		expect(columns).toEqual([
			[false, false, false],
			[false, false, false],
		]);
	});
});
