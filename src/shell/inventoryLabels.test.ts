import { describe, expect, it } from "vitest";
import type { HeldItem } from "../game/state.js";
import {
	formatHeldItemLabel,
	formatInventoryTitle,
	resolveItemVerbPrompt,
} from "./inventoryLabels.js";

describe("formatInventoryTitle", () => {
	it("appends the held count over capacity to the title", () => {
		expect(formatInventoryTitle(0)).toBe("持ち物(Escで閉じる) 0/26");
		expect(formatInventoryTitle(3)).toBe("持ち物(Escで閉じる) 3/26");
	});
});

describe("formatHeldItemLabel", () => {
	it("shows just the display name for an unequipped item", () => {
		const potion: HeldItem = { itemId: 1, kind: "heal-potion" };
		expect(formatHeldItemLabel(potion, [])).toBe("未鑑定の薬");
	});

	it("shows just the display name for an unequipped weapon — curse/bonus stay hidden until equipped", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: false,
			cursed: true,
			weaponKind: "long-sword" as const,
			hitBonus: 3,
			damageBonus: 3,
			quantity: 1,
		};
		expect(formatHeldItemLabel(weapon, [])).toBe("長剣");
	});

	it("prefixes the equipped glyph and shows the bonus for an equipped, uncursed weapon", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 2,
			damageBonus: 2,
			quantity: 1,
		};
		expect(formatHeldItemLabel(weapon, [])).toBe("✅ 長剣(命中+2・ダメージ+2)");
	});

	it("prefixes the equipped glyph and shows the bonus for an equipped armor", () => {
		const armor: HeldItem = {
			itemId: 1,
			kind: "armor",
			equipped: true,
			cursed: false,
			armorKind: "ring-mail" as const,
			defenseBonus: 1,
			rustProtected: false,
		};
		expect(formatHeldItemLabel(armor, [])).toBe("✅ リングメイル(防御4)");
		expect(
			formatHeldItemLabel(
				{
					...armor,
					cursed: true,
					armorKind: "ring-mail" as const,
					defenseBonus: -2,
				},
				[],
			),
		).toBe("✅ リングメイル(防御1・呪い)");
	});

	it("adds a curse tag (and no bonus tag) for an equipped, cursed ring", () => {
		const ring: HeldItem = {
			itemId: 1,
			kind: "regeneration-ring",
			equipped: true,
			cursed: true,
		};
		expect(formatHeldItemLabel(ring, [])).toBe("✅ 指輪(呪い)");
	});
});

describe("resolveItemVerbPrompt", () => {
	it("reads つかう for a consumable", () => {
		const potion: HeldItem = { itemId: 1, kind: "heal-potion" };
		expect(resolveItemVerbPrompt(potion)).toBe(
			"u: つかう  d: すてる (Escで戻る)",
		);
	});

	it("reads 装備する for an unequipped weapon/armor/ring", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: false,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
			quantity: 1,
		};
		/* an unwielded weapon can also be thrown */
		expect(resolveItemVerbPrompt(weapon)).toBe(
			"u: 装備する  d: すてる  t: なげる (Escで戻る)",
		);
		expect(resolveItemVerbPrompt({ ...weapon, equipped: true })).toBe(
			"u: はずす  d: すてる (Escで戻る)",
		);
	});

	it("reads はずす for an equipped weapon/armor/ring", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
			quantity: 1,
		};
		expect(resolveItemVerbPrompt(weapon)).toBe(
			"u: はずす  d: すてる (Escで戻る)",
		);
	});
});

describe("a stack of missiles", () => {
	it("shows how many the slot holds", () => {
		expect(
			formatHeldItemLabel(
				{
					itemId: 1,
					kind: "weapon",
					weaponKind: "arrow",
					equipped: false,
					cursed: false,
					hitBonus: 0,
					damageBonus: 0,
					quantity: 27,
				},
				[],
			),
		).toBe("矢×27");
	});
});
