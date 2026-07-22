import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import { buildFloorItem, toHeldItem } from "./heldItemFactory.js";

describe("buildFloorItem", () => {
	it("gives a consumable just its position and kind, no identity, never touching rng", () => {
		const item = buildFloorItem("heal-potion", 3, { x: 0, y: 0 }, createRng(1));
		expect(item).toEqual({ x: 0, y: 0, kind: "heal-potion" });
	});

	it("gives a sword an identity with the requested itemId and a positive baseline attackBonus", () => {
		const item = buildFloorItem("sword", 5, { x: 1, y: 2 }, createRng(1));
		if (item.kind !== "sword") {
			throw new Error("unreachable: requested a sword");
		}
		expect(item.identity.itemId).toBe(5);
		expect(typeof item.identity.cursed).toBe("boolean");
		expect(item.identity.attackBonus).toBeGreaterThan(0);
	});

	it("is deterministic: the same seed and itemId always produce the same identity", () => {
		const first = buildFloorItem("armor", 1, { x: 0, y: 0 }, createRng(42));
		const second = buildFloorItem("armor", 1, { x: 0, y: 0 }, createRng(42));
		expect(first).toEqual(second);
	});
});

describe("toHeldItem", () => {
	it("restores a floor sword's exact identity, adding equipped: false", () => {
		const item = {
			x: 0,
			y: 0,
			kind: "sword" as const,
			identity: { itemId: 7, cursed: true, attackBonus: 3 },
		};
		expect(toHeldItem(item, 999)).toEqual({
			itemId: 7,
			kind: "sword",
			equipped: false,
			cursed: true,
			attackBonus: 3,
		});
	});

	it("restores a floor ring's exact identity", () => {
		const item = {
			x: 0,
			y: 0,
			kind: "regeneration-ring" as const,
			identity: { itemId: 4, cursed: false },
		};
		expect(toHeldItem(item, 999)).toEqual({
			itemId: 4,
			kind: "regeneration-ring",
			equipped: false,
			cursed: false,
		});
	});

	it("gives a consumable the freshItemId — it has no identity to restore", () => {
		const item = { x: 0, y: 0, kind: "heal-potion" as const };
		expect(toHeldItem(item, 42)).toEqual({ itemId: 42, kind: "heal-potion" });
	});
});
