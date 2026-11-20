import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import {
	FOOD_RATION_RESTORE_MAX,
	FOOD_RATION_RESTORE_MIN,
	PLAYER_MAX_FOOD,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyUseFood } from "./food.js";

const buildState = (playerFood: number): GameState => ({
	...buildArenaGameState(9, 3, 1),
	playerFood,
});

describe("applyUseFood", () => {
	it("adds 1100-1499 food, as original Rogue's ration does, and logs what was gained", () => {
		const state = buildState(100);
		const next = applyUseFood(state);
		const gained = next.playerFood - state.playerFood;
		expect(gained).toBeGreaterThanOrEqual(FOOD_RATION_RESTORE_MIN);
		expect(gained).toBeLessThanOrEqual(FOOD_RATION_RESTORE_MAX);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: gained } },
		]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("never fills past PLAYER_MAX_FOOD", () => {
		const state = buildState(PLAYER_MAX_FOOD - 10);
		const next = applyUseFood(state);
		expect(next.playerFood).toBe(PLAYER_MAX_FOOD);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: 10 } },
		]);
	});

	it("brings a starving stomach back to zero first, then adds the ration", () => {
		const next = applyUseFood(buildState(-400));
		expect(next.playerFood).toBeGreaterThanOrEqual(FOOD_RATION_RESTORE_MIN);
		expect(next.playerFood).toBeLessThanOrEqual(FOOD_RATION_RESTORE_MAX);
	});

	it("eating through advanceTurn consumes the ration and spends the turn", () => {
		const state = {
			...buildState(100),
			inventory: [{ itemId: 1, kind: "food" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		/* the ration, minus the turn's own hunger tick */
		expect(next.playerFood).toBeGreaterThanOrEqual(
			100 + FOOD_RATION_RESTORE_MIN - 1,
		);
	});
});
