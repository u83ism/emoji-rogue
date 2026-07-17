import { describe, expect, it } from "vitest";
import { addToInventory, removeFromInventory } from "./inventory.js";

describe("addToInventory", () => {
	it("appends a new entry when the kind is not yet held", () => {
		expect(addToInventory([], "heal-potion")).toEqual([
			{ kind: "heal-potion", quantity: 1 },
		]);
	});

	it("stacks onto an existing entry of the same kind", () => {
		expect(
			addToInventory([{ kind: "heal-potion", quantity: 2 }], "heal-potion"),
		).toEqual([{ kind: "heal-potion", quantity: 3 }]);
	});

	it("leaves other kinds' stacks untouched", () => {
		expect(
			addToInventory([{ kind: "food", quantity: 1 }], "heal-potion"),
		).toEqual([
			{ kind: "food", quantity: 1 },
			{ kind: "heal-potion", quantity: 1 },
		]);
	});
});

describe("removeFromInventory", () => {
	it("decrements the stack of the given kind", () => {
		expect(
			removeFromInventory(
				[{ kind: "heal-potion", quantity: 2 }],
				"heal-potion",
			),
		).toEqual([{ kind: "heal-potion", quantity: 1 }]);
	});

	it("drops the entry entirely once the stack hits zero", () => {
		expect(
			removeFromInventory(
				[{ kind: "heal-potion", quantity: 1 }],
				"heal-potion",
			),
		).toEqual([]);
	});

	it("leaves other kinds' stacks untouched", () => {
		expect(
			removeFromInventory(
				[
					{ kind: "food", quantity: 1 },
					{ kind: "heal-potion", quantity: 1 },
				],
				"heal-potion",
			),
		).toEqual([{ kind: "food", quantity: 1 }]);
	});
});
