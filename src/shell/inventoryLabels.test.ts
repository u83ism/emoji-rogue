import { describe, expect, it } from "vitest";
import type { HeldItem } from "../game/state.js";
import {
	formatHeldItemLabel,
	formatInventoryTitle,
	resolveItemVerbPrompt,
} from "./inventoryLabels.js";

describe("formatInventoryTitle", () => {
	it("appends the held count over capacity to the title", () => {
		expect(formatInventoryTitle(0)).toBe("持ち物(iかEscで閉じる) 0/20");
		expect(formatInventoryTitle(3)).toBe("持ち物(iかEscで閉じる) 3/20");
	});
});

describe("formatHeldItemLabel", () => {
	it("shows just the display name for an unequipped item", () => {
		const potion: HeldItem = { itemId: 1, kind: "heal-potion" };
		expect(formatHeldItemLabel(potion, [])).toBe("未鑑定の薬");
	});

	it("shows just the display name for an unequipped sword — curse/bonus stay hidden until equipped", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: false,
			cursed: true,
			attackBonus: 3,
		};
		expect(formatHeldItemLabel(sword, [])).toBe("剣");
	});

	it("prefixes the equipped glyph and shows the bonus for an equipped, uncursed sword", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: true,
			cursed: false,
			attackBonus: 2,
		};
		expect(formatHeldItemLabel(sword, [])).toBe("✅ 剣(攻撃+2)");
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

	it("reads 装備する for an unequipped sword/armor/ring", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: false,
			cursed: false,
			attackBonus: 1,
		};
		expect(resolveItemVerbPrompt(sword)).toBe(
			"u: 装備する  d: すてる (Escで戻る)",
		);
	});

	it("reads はずす for an equipped sword/armor/ring", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: true,
			cursed: false,
			attackBonus: 1,
		};
		expect(resolveItemVerbPrompt(sword)).toBe(
			"u: はずす  d: すてる (Escで戻る)",
		);
	});
});
