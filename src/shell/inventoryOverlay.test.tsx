import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { INVENTORY_CAPACITY } from "../game/balance.js";
import { buildArenaGameState } from "../game/initialState.js";
import type { HeldItem } from "../game/state.js";
import { InventoryOverlay } from "./inventoryOverlay.js";

describe("InventoryOverlay", () => {
	it("shows the empty message and title with a 0 fill when nothing is held", () => {
		const state = buildArenaGameState(9, 3, 1);
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("持ち物(Escで閉じる) 0/26");
		expect(frame).toContain("何も持っていません");
	});

	it("lists one row per held slot (no stacking), each with its own letter", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "heal-potion" },
				{ itemId: 2, kind: "heal-potion" },
				{ itemId: 3, kind: "food" },
			] satisfies HeldItem[],
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("持ち物(Escで閉じる) 3/26");
		expect(frame).toContain("a) 未鑑定の薬");
		expect(frame).toContain("b) 未鑑定の薬");
		expect(frame).toContain("c) 食料");
	});

	it("flows a full pack into two columns so all 26 lettered rows fit the map's 20-line height", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: Array.from(
				{ length: INVENTORY_CAPACITY },
				(_unused, index): HeldItem => ({ itemId: index + 1, kind: "food" }),
			),
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("持ち物(Escで閉じる) 26/26");
		expect(frame.split("\n").length).toBeLessThanOrEqual(20);
		expect(frame).toMatch(/a\) 食料.*n\) 食料/);
		expect(frame).toMatch(/m\) 食料.*z\) 食料/);
	});

	it("swaps the row list for the selected item's name and the use/drop prompt", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: false,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [weapon],
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={weapon}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("長剣");
		expect(frame).toContain("u: 装備する  d: すてる (Escで戻る)");
		expect(frame).not.toContain("a) ");
	});

	it("reads はずす for an already-equipped selected item", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
		};
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [weapon] };
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={weapon}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("u: はずす  d: すてる (Escで戻る)");
	});

	it("shows an equipped item's bonus with the equipped glyph", () => {
		const weapon: HeldItem = {
			itemId: 1,
			kind: "weapon",
			equipped: true,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
		};
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [weapon] };
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("✅ 長剣(命中+1・ダメージ+1)");
	});

	it("shows a filtered target row list, prompt only, while pendingTargetFor is set", () => {
		const scroll: HeldItem = { itemId: 1, kind: "enchant-weapon" };
		const weaponA: HeldItem = {
			itemId: 2,
			kind: "weapon",
			equipped: false,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
		};
		const armor: HeldItem = {
			itemId: 3,
			kind: "armor",
			equipped: false,
			cursed: false,
			armorKind: "ring-mail" as const,
			defenseBonus: 1,
			rustProtected: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [scroll, weaponA, armor],
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={scroll}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("対象を選んでください(Escで閉じる)");
		expect(frame).toContain("a) 長剣");
		expect(frame).not.toContain("リングメイル");
		expect(frame).not.toContain("持ち物(");
	});
});
