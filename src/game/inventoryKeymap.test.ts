import { describe, expect, it } from "vitest";
import { INVENTORY_CAPACITY } from "./balance.js";
import {
	canThrowItem,
	filterScrollTargets,
	toInventoryLetter,
	toItemVerbAction,
	toSelectedHeldItem,
	toTargetedUseAction,
} from "./inventoryKeymap.js";
import type { HeldItem } from "./state.js";

const potion = (itemId: number): HeldItem => ({ itemId, kind: "heal-potion" });
const weapon = (itemId: number): HeldItem => ({
	itemId,
	kind: "weapon",
	equipped: false,
	cursed: false,
	weaponKind: "long-sword" as const,
	hitBonus: 1,
	damageBonus: 1,
	quantity: 1,
});

describe("toInventoryLetter", () => {
	it("assigns a, b, c, ... in order", () => {
		expect(toInventoryLetter(0)).toBe("a");
		expect(toInventoryLetter(1)).toBe("b");
		expect(toInventoryLetter(2)).toBe("c");
	});

	it("uses every letter a-z, i included, one per INVENTORY_CAPACITY slot", () => {
		expect(toInventoryLetter(7)).toBe("h");
		expect(toInventoryLetter(8)).toBe("i");
		expect(toInventoryLetter(9)).toBe("j");
		expect(toInventoryLetter(INVENTORY_CAPACITY - 1)).toBe("z");
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

	it("maps i to the 9th row like any other letter", () => {
		const nineItems: readonly HeldItem[] = [
			potion(1),
			{ itemId: 2, kind: "poison" },
			{ itemId: 3, kind: "food" },
			weapon(4),
			{
				itemId: 5,
				kind: "armor",
				equipped: false,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
			{ itemId: 6, kind: "teleport-scroll" },
			{ itemId: 7, kind: "mapping-scroll" },
			{ itemId: 8, kind: "identify-scroll" },
			{ itemId: 9, kind: "slow-wand", charges: 5 },
		];
		expect(toSelectedHeldItem("i", nineItems)?.kind).toBe("slow-wand");
		expect(toSelectedHeldItem("j", nineItems)).toBeUndefined();
	});
});

describe("filterScrollTargets", () => {
	it("offers an identify scroll every held potion, and nothing else", () => {
		const held: HeldItem[] = [
			potion(1),
			weapon(2),
			{ itemId: 3, kind: "blindness" },
			{ itemId: 4, kind: "food" },
		];
		expect(filterScrollTargets("identify-scroll", held)).toEqual([
			potion(1),
			{ itemId: 3, kind: "blindness" },
		]);
		expect(filterScrollTargets("identify-scroll", [weapon(2)])).toEqual([]);
	});

	it("returns undefined for a kind that takes no target — the enchant scrolls act on what is worn", () => {
		for (const kind of [
			"enchant-weapon",
			"enchant-armor",
			"protect-armor",
			"heal-potion",
			"weapon",
		] as const) {
			expect(filterScrollTargets(kind, [weapon(2)])).toBeUndefined();
		}
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
		const scroll: HeldItem = { itemId: 10, kind: "identify-scroll" };
		expect(toTargetedUseAction(scroll, potion(4))).toEqual({
			type: "use-item",
			payload: { itemId: 10, targetItemId: 4 },
		});
	});
});

describe("throwing from the verb prompt", () => {
	const dart: HeldItem = {
		itemId: 3,
		kind: "weapon",
		weaponKind: "dart",
		equipped: false,
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: 9,
	};

	it("t throws an unwielded weapon", () => {
		expect(canThrowItem(dart)).toBe(true);
		expect(toItemVerbAction("t", dart)).toEqual({
			type: "throw-item",
			payload: { itemId: 3 },
		});
	});

	it("t does nothing for the wielded weapon or for anything that is not a weapon", () => {
		const wielded = { ...dart, equipped: true };
		expect(canThrowItem(wielded)).toBe(false);
		expect(toItemVerbAction("t", wielded)).toBeUndefined();
		expect(canThrowItem(potion(1))).toBe(false);
		expect(toItemVerbAction("t", potion(1))).toBeUndefined();
	});
});
