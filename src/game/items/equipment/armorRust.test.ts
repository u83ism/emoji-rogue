import { describe, expect, it } from "vitest";
import type { HeldItem } from "../../state.js";
import { resolveArmorRust } from "./armorRust.js";
import { calculatePlayerDefense } from "./equipmentStats.js";

describe("items/equipment/armorRust", () => {
	it("a worn ring of maintain armor blocks rust like protected armor does", () => {
		const inventory = [
			{
				itemId: 1,
				kind: "armor" as const,
				equipped: true,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 2,
				rustProtected: false,
			},
			{
				itemId: 9,
				kind: "maintain-armor-ring" as const,
				equipped: true,
				cursed: false,
			},
		];
		const rust = resolveArmorRust(inventory);
		expect(rust.inventory).toBe(inventory);
		expect(rust.event).toEqual({ type: "armor-rust-blocked", payload: {} });
	});

	it("rust worsens the armor by 1 per hit, as in original Rogue: never past armor class 9, and never leather", () => {
		const armorWith = (defenseBonus: number) => [
			{
				itemId: 1,
				kind: "armor" as const,
				equipped: true,
				cursed: defenseBonus < 0,
				armorKind: "ring-mail" as const,
				defenseBonus,
				rustProtected: false,
			},
		];
		const rusted = (inventory: readonly HeldItem[]): number =>
			calculatePlayerDefense(resolveArmorRust(inventory).inventory);
		/* ring mail is armor class 7, i.e. 3 points of defense before its own bonus */
		expect(rusted(armorWith(2))).toBe(4);
		expect(rusted(armorWith(0))).toBe(2);
		expect(resolveArmorRust(armorWith(0)).event).toEqual({
			type: "armor-rusted",
			payload: { amount: 1 },
		});
		/* a cursed one keeps rusting too, down to armor class 9 (1 point of defense)... */
		expect(rusted(armorWith(-1))).toBe(1);
		/* ...and no further, silently */
		expect(rusted(armorWith(-2))).toBe(1);
		expect(resolveArmorRust(armorWith(-2)).event).toBeUndefined();

		const leather = armorWith(0).map((armor) => ({
			...armor,
			armorKind: "leather-armor" as const,
		}));
		expect(resolveArmorRust(leather)).toEqual({
			inventory: leather,
			event: undefined,
		});
	});

	it("protected armor blocks rust and logs armor-rust-blocked, as original Rogue's rust_armor()", () => {
		const protectedArmor: readonly HeldItem[] = [
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				armorKind: "ring-mail",
				defenseBonus: 0,
				rustProtected: true,
			},
		];
		expect(resolveArmorRust(protectedArmor)).toEqual({
			inventory: protectedArmor,
			event: { type: "armor-rust-blocked", payload: {} },
		});
	});
});
