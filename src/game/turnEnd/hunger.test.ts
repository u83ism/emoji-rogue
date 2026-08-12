import { describe, expect, it } from "vitest";
import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_WEAK_THRESHOLD,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState, HeldItem } from "../state.js";
import { applyHungerTick } from "./hunger.js";

/** An equipped ring of sustenance — the new stand-in for the old hasRingOfSustenance flag. */
const equippedSustenanceRing: HeldItem = {
	itemId: 1,
	kind: "sustenance-ring",
	equipped: true,
	cursed: false,
};

describe("applyHungerTick", () => {
	it("decrements playerFood by one with no event when nowhere near the threshold", () => {
		const state = buildArenaGameState(5, 5, 1);
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(state.playerFood - 1);
		expect(next.events).toEqual([]);
		expect(next.status).toBe("playing");
	});

	it("fires player-hungry exactly once, the turn food crosses the warning threshold", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD + 1,
		};
		const crossing = applyHungerTick(state);
		expect(crossing.playerFood).toBe(PLAYER_HUNGER_WARNING_THRESHOLD);
		expect(crossing.events).toEqual([{ type: "player-hungry", payload: {} }]);

		const alreadyBelow = applyHungerTick(crossing);
		expect(alreadyBelow.playerFood).toBe(PLAYER_HUNGER_WARNING_THRESHOLD - 1);
		/* no new event this tick — the log carries over unchanged */
		expect(alreadyBelow.events).toEqual(crossing.events);
	});

	it("fires player-weak exactly once, the turn food crosses PLAYER_WEAK_THRESHOLD", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: PLAYER_WEAK_THRESHOLD + 1,
		};
		const crossing = applyHungerTick(state);
		expect(crossing.playerFood).toBe(PLAYER_WEAK_THRESHOLD);
		expect(crossing.events).toEqual([{ type: "player-weak", payload: {} }]);

		const alreadyBelow = applyHungerTick(crossing);
		expect(alreadyBelow.playerFood).toBe(PLAYER_WEAK_THRESHOLD - 1);
		/* no new event this tick — the log carries over unchanged */
		expect(alreadyBelow.events).toEqual(crossing.events);
	});

	it("deals starvation damage and logs player-starved once food reaches zero", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: 1,
			playerHp: 5,
		};
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(0);
		expect(next.playerHp).toBe(4);
		expect(next.events).toEqual([
			{ type: "player-starved", payload: { damage: 1 } },
		]);
		expect(next.status).toBe("playing");
	});

	it("keeps playerFood clamped at zero on further ticks while starving", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: 0,
			playerHp: 5,
		};
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(0);
		expect(next.playerHp).toBe(4);
	});

	it("ends the run with player-died (by hunger) when starvation drops HP to zero", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: 0,
			playerHp: 1,
		};
		const next = applyHungerTick(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-starved", payload: { damage: 1 } },
			{ type: "player-died", payload: { by: "hunger" } },
		]);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			playerFood: 1,
			status: "dead",
		};
		expect(applyHungerTick(state)).toBe(state);
	});

	/*
	 * Whether a ring of sustenance skips the tick is a
	 * SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT chance (see balance.ts) — seed 1's
	 * first roll succeeds (skips), seed 2000's fails (ticks normally).
	 */
	it("skips the whole tick (food and rng only) when the ring's roll succeeds", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			inventory: [equippedSustenanceRing],
		};
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(state.playerFood);
		expect(next.events).toEqual([]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("ticks normally, still consuming rng, when the ring's roll fails", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 2000),
			inventory: [equippedSustenanceRing],
		};
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(state.playerFood - 1);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("never touches rng without the ring", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyHungerTick(state).rng).toEqual(state.rng);
	});
});
