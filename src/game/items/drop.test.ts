import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import { applyItemDrop } from "./drop.js";

describe("applyItemDrop", () => {
	it("moves one held slot from inventory onto the player's tile", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["heal-potion" as const, "heal-potion" as const],
		};
		const next = applyItemDrop(state, "heal-potion");
		expect(next.inventory).toEqual(["heal-potion"]);
		expect(next.items).toEqual([
			{ x: state.player.x, y: state.player.y, kind: "heal-potion" },
		]);
		expect(next.events).toEqual([
			{ type: "item-dropped", payload: { kind: "heal-potion" } },
		]);
	});

	it("drops the only held slot of that kind, leaving inventory empty", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["food" as const],
		};
		const next = applyItemDrop(state, "food");
		expect(next.inventory).toEqual([]);
	});

	it("is a no-op when the kind is not held", () => {
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [] };
		const next = applyItemDrop(state, "food");
		expect(next).toBe(state);
	});
});
