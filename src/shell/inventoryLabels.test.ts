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
			attackBonus: 3,
		};
		expect(formatHeldItemLabel(weapon, [])).toBe("剣");
	});

	it("prefixes the equipped glyph and shows the bonus for an equipped, uncursed weapon", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			attackBonus: 2,
		};
		expect(formatHeldItemLabel(weapon, [])).toBe("✅ 剣(攻撃+2)");
	});

	it("prefixes the equipped glyph and shows the bonus for an equipped armor", () => {
		const armor: HeldItem = {
			itemId: 1,
			kind: "armor",
			equipped: true,
			cursed: false,
			defenseBonus: 1,
			rustProtected: false,
		};
		expect(formatHeldItemLabel(armor, [])).toBe("✅ 鎧(防御+1)");
		expect(
			formatHeldItemLabel({ ...armor, cursed: true, defenseBonus: -2 }, []),
		).toBe("✅ 鎧(防御-2・呪い)");
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
			attackBonus: 1,
		};
		expect(resolveItemVerbPrompt(weapon)).toBe(
			"u: 装備する  d: すてる (Escで戻る)",
		);
	});

	it("reads はずす for an equipped weapon/armor/ring", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			attackBonus: 1,
		};
		expect(resolveItemVerbPrompt(weapon)).toBe(
			"u: はずす  d: すてる (Escで戻る)",
		);
	});
});
