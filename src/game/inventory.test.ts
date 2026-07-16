import { describe, expect, it } from "vitest";
import { addToInventory, removeFromInventory } from "./inventory.js";

describe("addToInventory", () => {
	it("appends a new entry when the kind is not yet held", () => {
		expect(addToInventory([], "potion")).toEqual([
			{ kind: "potion", quantity: 1 },
		]);
	});

	it("stacks onto an existing entry of the same kind", () => {
		expect(addToInventory([{ kind: "potion", quantity: 2 }], "potion")).toEqual(
			[{ kind: "potion", quantity: 3 }],
		);
	});

	it("leaves other kinds' stacks untouched", () => {
		expect(addToInventory([{ kind: "food", quantity: 1 }], "potion")).toEqual([
			{ kind: "food", quantity: 1 },
			{ kind: "potion", quantity: 1 },
		]);
	});
});

describe("removeFromInventory", () => {
	it("decrements the stack of the given kind", () => {
		expect(
			removeFromInventory([{ kind: "potion", quantity: 2 }], "potion"),
		).toEqual([{ kind: "potion", quantity: 1 }]);
	});

	it("drops the entry entirely once the stack hits zero", () => {
		expect(
			removeFromInventory([{ kind: "potion", quantity: 1 }], "potion"),
		).toEqual([]);
	});

	it("leaves other kinds' stacks untouched", () => {
		expect(
			removeFromInventory(
				[
					{ kind: "food", quantity: 1 },
					{ kind: "potion", quantity: 1 },
				],
				"potion",
			),
		).toEqual([{ kind: "food", quantity: 1 }]);
	});
});
