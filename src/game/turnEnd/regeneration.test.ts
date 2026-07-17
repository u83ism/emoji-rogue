import { describe, expect, it } from "vitest";
import { PLAYER_MAX_HP } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyRegenerationTick } from "./regeneration.js";

describe("applyRegenerationTick", () => {
	it("is a no-op (same reference) without a ring of regeneration", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyRegenerationTick(state)).toBe(state);
	});

	it("is a no-op (same reference) at full HP even with a ring equipped", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hasRingOfRegeneration: true,
		};
		expect(applyRegenerationTick(state)).toBe(state);
	});

	/*
	 * Whether the per-turn roll heals is a RING_REGEN_CHANCE_PERCENT chance
	 * (see balance.ts) — seed 1's first roll succeeds, seed 411's fails.
	 */
	it("heals 1 HP and logs player-regenerated when the roll succeeds", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hasRingOfRegeneration: true,
			playerHp: PLAYER_MAX_HP - 3,
		};
		const next = applyRegenerationTick(state);
		expect(next.playerHp).toBe(state.playerHp + 1);
		expect(next.events).toEqual([
			{ type: "player-regenerated", payload: { amount: 1 } },
		]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("advances the rng but changes nothing else when the roll fails", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 411),
			hasRingOfRegeneration: true,
			playerHp: PLAYER_MAX_HP - 3,
		};
		const next = applyRegenerationTick(state);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hasRingOfRegeneration: true,
			playerHp: PLAYER_MAX_HP - 3,
			status: "dead",
		};
		expect(applyRegenerationTick(state)).toBe(state);
	});
});
