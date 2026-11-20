import { describe, expect, it } from "vitest";
import type { Cell } from "./cell.js";
import { groupIntoRuns } from "./runs.js";

describe("groupIntoRuns", () => {
	it("returns an empty array for an empty row", () => {
		expect(groupIntoRuns([], "standard")).toEqual([]);
	});

	it("collapses consecutive cells with identical colors into one run", () => {
		const row: Cell[] = [
			{ glyph: "a", fg: "red" },
			{ glyph: "b", fg: "red" },
			{ glyph: "c", fg: "red" },
		];
		expect(groupIntoRuns(row, "standard")).toEqual([
			{ text: "abc", fg: "red", bg: undefined },
		]);
	});

	it("starts a new run when the color changes", () => {
		const row: Cell[] = [
			{ glyph: "a", fg: "red" },
			{ glyph: "b", fg: "blue" },
			{ glyph: "c", fg: "blue" },
		];
		expect(groupIntoRuns(row, "standard")).toEqual([
			{ text: "a", fg: "red", bg: undefined },
			{ text: "bc", fg: "blue", bg: undefined },
		]);
	});

	it("treats fg and bg independently", () => {
		const row: Cell[] = [
			{ glyph: "a", fg: "red", bg: "black" },
			{ glyph: "b", fg: "red", bg: "white" },
		];
		expect(groupIntoRuns(row, "standard")).toEqual([
			{ text: "a", fg: "red", bg: "black" },
			{ text: "b", fg: "red", bg: "white" },
		]);
	});

	it("pads glyphs the vscode profile counts as narrow, inside the same run", () => {
		const row: Cell[] = [{ glyph: "🟫" }, { glyph: "🦤" }, { glyph: "🟫" }];
		expect(groupIntoRuns(row, "vscode")).toEqual([
			{ text: "🟫🦤 🟫", fg: undefined, bg: undefined },
		]);
	});

	it("does not mutate the input cells", () => {
		const row: Cell[] = [
			{ glyph: "a", fg: "red" },
			{ glyph: "b", fg: "red" },
		];
		const original = row.map((cell) => ({ ...cell }));
		groupIntoRuns(row, "standard");
		expect(row).toEqual(original);
	});
});
