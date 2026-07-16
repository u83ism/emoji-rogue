import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { PLAYER_MAX_FOOD } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";

describe("useItem/food", () => {
	it("using a held food ration restores food up to the cap, one consumed from inventory", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerFood: 70 /* missing 30, a ration restores 50: the cap must win */,
			inventory: [{ kind: "food" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "food" },
		});
		/* restored to the cap (100), then the same turn's hunger tick takes one back */
		expect(next.playerFood).toBe(PLAYER_MAX_FOOD - 1);
		expect(next.inventory).toEqual([{ kind: "food", quantity: 1 }]);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: 30 } },
		]);
		expect(next.hasEaten).toBe(true);
	});

	it("using the last food ration at full satiety wastes it (amount 0) and empties the stack", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "food" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "food" },
		});
		/* already full, so eating restores nothing; the turn's hunger tick still applies */
		expect(next.playerFood).toBe(state.playerFood - 1);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: 0 } },
		]);
		expect(next.hasEaten).toBe(
			true,
		); /* still counts, even at 0 nutrition gained */
	});
});
