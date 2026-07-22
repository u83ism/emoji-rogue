import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { ZOMBIE_MAX_HP } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy } from "../state.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

describe("applyUseItem dispatch", () => {
	it("using an item spends a turn: adjacent enemies still get to act", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "heal-potion" as const }],
			enemies: [zombie(5, 1)] /* adjacent to the player */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events.some((event) => event.type === "player-hit")).toBe(true);
	});

	it("using an itemId with nothing held under it is a no-op (same reference, no turn spent)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)] /* adjacent — would hit if enemies acted */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
