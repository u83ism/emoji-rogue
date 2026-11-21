import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import { applyItemEffect } from "./itemEffect.js";

describe("applyItemEffect", () => {
	it("hands each kind to its own effect — eating food fills the player", () => {
		const hungry = { ...buildArenaGameState(9, 3, 1), playerFood: 100 };
		const fed = applyItemEffect(
			hungry,
			{ itemId: 1, kind: "food" },
			undefined,
			undefined,
		);
		expect(fed.playerFood).toBeGreaterThan(100);
	});

	it("leaves the state alone for a wand zapped with no direction", () => {
		const state = buildArenaGameState(9, 3, 1);
		expect(
			applyItemEffect(
				state,
				{ itemId: 1, kind: "slow-wand", charges: 3 },
				undefined,
				undefined,
			),
		).toBe(state);
	});
});
