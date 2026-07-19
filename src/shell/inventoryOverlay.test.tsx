import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import { InventoryOverlay } from "./inventoryOverlay.js";

describe("InventoryOverlay", () => {
	it("shows the empty message and title with a 0 fill when nothing is held", () => {
		const state = buildArenaGameState(9, 3, 1);
		const { lastFrame } = render(
			<InventoryOverlay state={state} selectedItemKind={undefined} />,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("持ち物(iかEscで閉じる) 0/20");
		expect(frame).toContain("何も持っていません");
	});

	it("lists one row per held slot (no stacking), each with its own letter", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				"heal-potion" as const,
				"heal-potion" as const,
				"food" as const,
			],
		};
		const { lastFrame } = render(
			<InventoryOverlay state={state} selectedItemKind={undefined} />,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("持ち物(iかEscで閉じる) 3/20");
		expect(frame).toContain("a) 未鑑定の薬");
		expect(frame).toContain("b) 未鑑定の薬");
		expect(frame).toContain("c) 食料");
	});

	it("swaps the row list for the selected item's name and the use/drop prompt", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["sword" as const],
		};
		const { lastFrame } = render(
			<InventoryOverlay state={state} selectedItemKind="sword" />,
		);
		const frame = lastFrame() ?? "";
		expect(frame).toContain("剣");
		expect(frame).toContain("u: つかう  d: すてる (Escで戻る)");
		expect(frame).not.toContain("a) ");
	});
});
