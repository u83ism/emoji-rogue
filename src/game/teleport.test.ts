import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";

describe("teleport", () => {
	it("is deterministic: the same state always teleports to the same tile", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["teleport-scroll" as const],
		};
		const action = {
			type: "use-item",
			payload: { kind: "teleport-scroll" },
		} as const;
		expect(advanceTurn(state, action)).toEqual(advanceTurn(state, action));
	});

	it("never teleports onto a tile occupied by an enemy", () => {
		let state = buildDungeonGameState(40, 20, 42);
		state = {
			...state,
			inventory: ["teleport-scroll" as const],
		};
		for (let attempt = 0; attempt < 20; attempt++) {
			const next = advanceTurn(state, {
				type: "use-item",
				payload: { kind: "teleport-scroll" },
			});
			for (const enemy of next.enemies) {
				expect(enemy.x === next.player.x && enemy.y === next.player.y).toBe(
					false,
				);
			}
			state = { ...next, inventory: state.inventory };
		}
	});
});
