import { describe, expect, it } from "vitest";
import { buildStartingInventory } from "./startingInventory.js";

describe("buildStartingInventory", () => {
	const inventory = buildStartingInventory(30);

	it("wields the +1,+1 mace and wears the +1 ring mail, as original Rogue's init_player() does", () => {
		expect(inventory[0]).toEqual({
			itemId: 1,
			kind: "weapon",
			weaponKind: "mace",
			equipped: true,
			cursed: false,
			hitBonus: 1,
			damageBonus: 1,
			quantity: 1,
		});
		expect(inventory[1]).toEqual({
			itemId: 2,
			kind: "armor",
			armorKind: "ring-mail",
			equipped: true,
			cursed: false,
			defenseBonus: 1,
			rustProtected: false,
		});
	});

	it("carries one food ration, an unwielded +1 bow, and the given number of arrows in one slot", () => {
		expect(inventory[2]).toEqual({ itemId: 3, kind: "food-ration" });
		expect(inventory[3]).toMatchObject({
			weaponKind: "short-bow",
			equipped: false,
			hitBonus: 1,
		});
		expect(inventory[4]).toMatchObject({ weaponKind: "arrow", quantity: 30 });
		expect(inventory.length).toBe(5);
	});

	it("gives every item its own id", () => {
		const ids = inventory.map((item) => item.itemId);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
