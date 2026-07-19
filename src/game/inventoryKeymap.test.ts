import { describe, expect, it } from "vitest";
import type { ItemKind } from "./events.js";
import {
	toInventoryLetter,
	toItemVerbAction,
	toSelectedItemKind,
} from "./inventoryKeymap.js";

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

describe("toSelectedItemKind", () => {
	const inventory: readonly ItemKind[] = ["heal-potion", "heal-potion"];

	it("maps the row's letter to the held kind", () => {
		expect(toSelectedItemKind("a", inventory)).toBe("heal-potion");
	});

	it("returns undefined for a letter with no matching row", () => {
		expect(toSelectedItemKind("c", inventory)).toBeUndefined();
		expect(toSelectedItemKind("a", [])).toBeUndefined();
	});

	it("never maps i to a row — the 9th entry answers to j instead", () => {
		const nineKinds: readonly ItemKind[] = [
			"heal-potion",
			"poison",
			"food",
			"sword",
			"armor",
			"teleport-scroll",
			"mapping-scroll",
			"identify-scroll",
			"striking-wand",
		];
		expect(toSelectedItemKind("i", nineKinds)).toBeUndefined();
		expect(toSelectedItemKind("j", nineKinds)).toBe("striking-wand");
	});
});

describe("toItemVerbAction", () => {
	it("maps u to a use-item action for the selected kind", () => {
		expect(toItemVerbAction("u", "heal-potion")).toEqual({
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
	});

	it("maps d to a drop-item action for the selected kind", () => {
		expect(toItemVerbAction("d", "heal-potion")).toEqual({
			type: "drop-item",
			payload: { kind: "heal-potion" },
		});
	});

	it("returns undefined for any other key", () => {
		expect(toItemVerbAction("x", "heal-potion")).toBeUndefined();
	});
});
