import { describe, expect, it } from "vitest";
import {
	resolveTargetKind,
	toInventoryLetter,
	toItemVerbAction,
	toSelectedHeldItem,
	toTargetedUseAction,
} from "./inventoryKeymap.js";
import type { HeldItem } from "./state.js";

const potion = (itemId: number): HeldItem => ({ itemId, kind: "heal-potion" });
const sword = (itemId: number): HeldItem => ({
	itemId,
	kind: "sword",
	equipped: false,
	cursed: false,
	attackBonus: 1,
});

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

describe("toSelectedHeldItem", () => {
	const inventory: readonly HeldItem[] = [potion(1), potion(2)];

	it("maps the row's letter to the held item", () => {
		expect(toSelectedHeldItem("a", inventory)).toEqual(potion(1));
	});

	it("returns undefined for a letter with no matching row", () => {
		expect(toSelectedHeldItem("c", inventory)).toBeUndefined();
		expect(toSelectedHeldItem("a", [])).toBeUndefined();
	});

	it("never maps i to a row — the 9th entry answers to j instead", () => {
		const nineItems: readonly HeldItem[] = [
			potion(1),
			{ itemId: 2, kind: "poison" },
			{ itemId: 3, kind: "food" },
			sword(4),
			{
				itemId: 5,
				kind: "armor",
				equipped: false,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			},
			{ itemId: 6, kind: "teleport-scroll" },
			{ itemId: 7, kind: "mapping-scroll" },
			{ itemId: 8, kind: "identify-scroll" },
			{ itemId: 9, kind: "striking-wand" },
		];
		expect(toSelectedHeldItem("i", nineItems)).toBeUndefined();
		expect(toSelectedHeldItem("j", nineItems)?.kind).toBe("striking-wand");
	});
});

describe("resolveTargetKind", () => {
	it("maps enchant-weapon to sword", () => {
		expect(resolveTargetKind("enchant-weapon")).toBe("sword");
	});

	it("maps enchant-armor and protect-armor to armor", () => {
		expect(resolveTargetKind("enchant-armor")).toBe("armor");
		expect(resolveTargetKind("protect-armor")).toBe("armor");
	});

	it("returns undefined for every other kind", () => {
		expect(resolveTargetKind("heal-potion")).toBeUndefined();
		expect(resolveTargetKind("sword")).toBeUndefined();
		expect(resolveTargetKind("remove-curse-scroll")).toBeUndefined();
	});
});

describe("toItemVerbAction", () => {
	it("maps u to a targetless use-item action for the selected item's id", () => {
		expect(toItemVerbAction("u", potion(1))).toEqual({
			type: "use-item",
			payload: { itemId: 1 },
		});
	});

	it("maps d to a drop-item action for the selected item's id", () => {
		expect(toItemVerbAction("d", potion(1))).toEqual({
			type: "drop-item",
			payload: { itemId: 1 },
		});
	});

	it("returns undefined for any other key", () => {
		expect(toItemVerbAction("x", potion(1))).toBeUndefined();
	});
});

describe("toTargetedUseAction", () => {
	it("builds a use-item action carrying both the source and target itemIds", () => {
		const scroll: HeldItem = { itemId: 10, kind: "enchant-weapon" };
		expect(toTargetedUseAction(scroll, sword(4))).toEqual({
			type: "use-item",
			payload: { itemId: 10, targetItemId: 4 },
		});
	});
});
