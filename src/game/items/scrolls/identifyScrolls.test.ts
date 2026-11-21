import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../../initialState.js";
import type { HeldItem } from "../../state.js";
import { applyUseIdentifyScroll } from "./identifyScrolls.js";

const held: readonly HeldItem[] = [
	{ itemId: 1, kind: "poison" },
	{ itemId: 2, kind: "mapping-scroll" },
];

describe("applyUseIdentifyScroll", () => {
	it("names the kind of the item it is pointed at, of its own sort only", () => {
		const state = { ...buildArenaGameState(9, 3, 1), inventory: held };
		expect(
			applyUseIdentifyScroll(state, "identify-scroll-scroll", 2)
				.identifiedItemKinds,
		).toEqual(["mapping-scroll"]);
		expect(
			applyUseIdentifyScroll(state, "identify-potion-scroll", 1)
				.identifiedItemKinds,
		).toEqual(["poison"]);
		/* a scroll scroll pointed at a potion is wasted */
		const wasted = applyUseIdentifyScroll(state, "identify-scroll-scroll", 1);
		expect(wasted.identifiedItemKinds).toEqual([]);
		expect(wasted.events.at(-1)).toEqual({
			type: "scroll-wasted",
			payload: { kind: "identify-scroll-scroll" },
		});
	});
});

describe("the identify ring, wand or staff scroll", () => {
	it("names the kind and tells that very item's numbers", () => {
		const wand: HeldItem = { itemId: 5, kind: "slow-wand", charges: 4 };
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [...held, wand],
		};
		const read = applyUseIdentifyScroll(state, "identify-ring-wand-scroll", 5);
		expect(read.identifiedItemKinds).toEqual(["slow-wand"]);
		expect(read.knownItemIds).toEqual([5]);
		/* a potion is not its business */
		expect(
			applyUseIdentifyScroll(state, "identify-ring-wand-scroll", 1)
				.knownItemIds,
		).toEqual([]);
	});
});
