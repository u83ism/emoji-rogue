import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
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
		expect(frame).toContain("持ち物(iかEscで閉じる) 0/20");
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
		expect(frame).toContain("持ち物(iかEscで閉じる) 3/20");
		expect(frame).toContain("a) 未鑑定の薬");
		expect(frame).toContain("b) 未鑑定の薬");
		expect(frame).toContain("c) 食料");
	});

	it("swaps the row list for the selected item's name and the use/drop prompt", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: false,
			cursed: false,
			attackBonus: 1,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [sword],
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={sword}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("剣");
		expect(frame).toContain("u: 装備する  d: すてる (Escで戻る)");
		expect(frame).not.toContain("a) ");
	});

	it("reads はずす for an already-equipped selected item", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: true,
			cursed: false,
			attackBonus: 1,
		};
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [sword] };
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={sword}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("u: はずす  d: すてる (Escで戻る)");
	});

	it("shows an equipped item's bonus with the equipped glyph", () => {
		const sword: HeldItem = {
			itemId: 1,
			kind: "sword",
			equipped: true,
			cursed: false,
			attackBonus: 1,
		};
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [sword] };
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={undefined}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("✅ 剣(攻撃+1)");
	});

	it("shows a filtered target row list, prompt only, while pendingTargetFor is set", () => {
		const scroll: HeldItem = { itemId: 1, kind: "enchant-weapon" };
		const swordA: HeldItem = {
			itemId: 2,
			kind: "sword",
			equipped: false,
			cursed: false,
			attackBonus: 1,
		};
		const armor: HeldItem = {
			itemId: 3,
			kind: "armor",
			equipped: false,
			cursed: false,
			defenseBonus: 1,
			rustProtected: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [scroll, swordA, armor],
		};
		const { lastFrame } = render(
			<InventoryOverlay
				state={state}
				selectedItem={undefined}
				pendingTargetFor={scroll}
			/>,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("対象を選んでください(iかEscで閉じる)");
		expect(frame).toContain("a) 剣");
		expect(frame).not.toContain("鎧");
		expect(frame).not.toContain("持ち物(");
	});
});
