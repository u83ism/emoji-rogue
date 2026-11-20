import { describe, expect, it } from "vitest";
import { ITEM_KIND_VALUES } from "../events.js";
import {
	calculateItemDrawSharePercent,
	ITEM_CATEGORY_TOTAL_WEIGHT,
	ITEM_KIND_WEIGHTS,
	pickByWeight,
} from "./spawnTable.js";

describe("spawnTable", () => {
	it("the category weights are original Rogue's things[], summing to 100", () => {
		expect(ITEM_CATEGORY_TOTAL_WEIGHT).toBe(100);
	});

	it("every item kind is in exactly one table, and the shares add up to 100%", () => {
		const listed = Object.values(ITEM_KIND_WEIGHTS).flatMap((kinds) =>
			kinds.map((entry) => entry.kind),
		);
		expect([...listed].sort()).toEqual([...ITEM_KIND_VALUES].sort());
		const total = ITEM_KIND_VALUES.reduce(
			(sum, kind) => sum + calculateItemDrawSharePercent(kind),
			0,
		);
		expect(total).toBeCloseTo(100, 6);
	});

	it("pickByWeight walks the weights in order", () => {
		const entries = [
			{ name: "a", weight: 2 },
			{ name: "b", weight: 3 },
		];
		expect(pickByWeight(entries, 0).name).toBe("a");
		expect(pickByWeight(entries, 1).name).toBe("a");
		expect(pickByWeight(entries, 2).name).toBe("b");
		expect(pickByWeight(entries, 4).name).toBe("b");
	});
});
