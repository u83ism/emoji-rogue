import { describe, expect, it } from "vitest";
import { toInventoryLetter, toUseItemAction } from "./inventoryKeymap.js";
import type { InventoryEntry } from "./state.js";

describe("toInventoryLetter", () => {
	it("assigns a, b, c, ... in order", () => {
		expect(toInventoryLetter(0)).toBe("a");
		expect(toInventoryLetter(1)).toBe("b");
		expect(toInventoryLetter(2)).toBe("c");
	});
});

describe("toUseItemAction", () => {
	const inventory: readonly InventoryEntry[] = [
		{ kind: "heal-potion", quantity: 2 },
	];

	it("maps the row's letter to a use-item action for that kind", () => {
		expect(toUseItemAction("a", inventory)).toEqual({
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
	});

	it("returns undefined for a letter with no matching row", () => {
		expect(toUseItemAction("b", inventory)).toBeUndefined();
		expect(toUseItemAction("a", [])).toBeUndefined();
	});
});
