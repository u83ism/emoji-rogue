import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyTeleportationRingTick } from "./ringTeleport.js";

const withRing = (rng: RngState): GameState => ({
	...buildArenaGameState(15, 15, 1),
	rng,
	inventory: [
		{ itemId: 1, kind: "teleportation-ring", equipped: true, cursed: true },
	],
});

describe("applyTeleportationRingTick", () => {
	it("leaves the state alone, rng and all, with no teleportation ring worn", () => {
		const state = buildArenaGameState(15, 15, 1);
		expect(applyTeleportationRingTick(state)).toBe(state);
	});

	it("jumps the player now and then — about 1 turn in 50", () => {
		let rng = seedToState(1);
		let jumps = 0;
		for (let turn = 0; turn < 2000; turn++) {
			const next = applyTeleportationRingTick(withRing(rng));
			if (next.events.some((event) => event.type === "player-teleported")) {
				jumps += 1;
				expect(next.events.at(-1)).toMatchObject({
					type: "player-teleported",
					payload: { source: "teleportation-ring" },
				});
			}
			rng = stepUniform(next.rng).state;
		}
		expect(jumps).toBeGreaterThan(15);
		expect(jumps).toBeLessThan(80);
	});
});
