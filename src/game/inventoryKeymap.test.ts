import { describe, expect, it } from "vitest";
import { toInventoryLetter, toUseItemAction } from "./inventoryKeymap.js";
import type { InventoryEntry } from "./state.js";

describe("toInventoryLetter", () => {
	it("assigns a, b, c, ... in order", () => {
		expect(toInventoryLetter(0)).toBe("a");
		expect(toInventoryLetter(1)).toBe("b");
		expect(toInventoryLetter(2)).toBe("c");
	});

	it("skips i (the close-overlay key), so the 9th row gets j", () => {
		expect(toInventoryLetter(7)).toBe("h");
		expect(toInventoryLetter(8)).toBe("j");
		expect(toInventoryLetter(9)).toBe("k");
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

	it("never maps i to a row — the 9th entry answers to j instead", () => {
		const nineKinds: readonly InventoryEntry[] = [
			{ kind: "heal-potion", quantity: 1 },
			{ kind: "poison", quantity: 1 },
			{ kind: "food", quantity: 1 },
			{ kind: "sword", quantity: 1 },
			{ kind: "armor", quantity: 1 },
			{ kind: "teleport-scroll", quantity: 1 },
			{ kind: "mapping-scroll", quantity: 1 },
			{ kind: "identify-scroll", quantity: 1 },
			{ kind: "striking-wand", quantity: 1 },
		];
		expect(toUseItemAction("i", nineKinds)).toBeUndefined();
		expect(toUseItemAction("j", nineKinds)).toEqual({
			type: "use-item",
			payload: { kind: "striking-wand" },
		});
	});
});
