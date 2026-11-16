import { describe, expect, it } from "vitest";
import {
	NATURAL_HEALING_FAST_INTERVAL,
	NATURAL_HEALING_FAST_LEVEL,
	RING_REGEN_AMOUNT,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState, HeldItem } from "../state.js";
import { applyRegenerationTick } from "./regeneration.js";

const equippedRegenerationRing: HeldItem = {
	itemId: 1,
	kind: "regeneration-ring",
	equipped: true,
	cursed: false,
};

/** A wounded level-`playerLevel` player with plenty of room to heal. */
const buildWoundedState = (playerLevel: number): GameState => ({
	...buildArenaGameState(5, 5, 1),
	playerLevel,
	playerHp: 10,
	playerMaxHp: 100,
});

/** How many ticks it takes for playerHp to first change. */
const countTicksUntilHealed = (start: GameState): number => {
	let state = start;
	for (let tick = 1; tick <= 100; tick++) {
		state = applyRegenerationTick(state);
		if (state.playerHp !== start.playerHp) {
			return tick;
		}
	}
	throw new Error("never healed within 100 ticks");
};

describe("applyRegenerationTick", () => {
	it("counts a quiet turn and heals nothing while it has not been quiet long enough", () => {
		const state = buildWoundedState(1);
		const next = applyRegenerationTick(state);
		expect(next.quietTurns).toBe(1);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([]);
	});

	it("heals 1 HP every 19 quiet turns at level 1 and every 7 at level 7, as original Rogue's doctor() does", () => {
		expect(countTicksUntilHealed(buildWoundedState(1))).toBe(19);
		expect(countTicksUntilHealed(buildWoundedState(7))).toBe(7);
	});

	it("resets quietTurns when it heals, so the wait starts over", () => {
		let state = buildWoundedState(7);
		for (let tick = 0; tick < 7; tick++) {
			state = applyRegenerationTick(state);
		}
		expect(state.playerHp).toBe(11);
		expect(state.quietTurns).toBe(0);
		expect(countTicksUntilHealed(state)).toBe(7);
	});

	it("a fight (quietTurns back to 0) postpones the next heal", () => {
		let state = buildWoundedState(7);
		for (let tick = 0; tick < 6; tick++) {
			state = applyRegenerationTick(state);
		}
		const interrupted = { ...state, quietTurns: 0 };
		expect(applyRegenerationTick(interrupted).playerHp).toBe(state.playerHp);
	});

	it(`from level ${NATURAL_HEALING_FAST_LEVEL} on, heals 1..(level - 7) HP every ${NATURAL_HEALING_FAST_INTERVAL} quiet turns, rolling state.rng`, () => {
		const start = buildWoundedState(10);
		expect(countTicksUntilHealed(start)).toBe(NATURAL_HEALING_FAST_INTERVAL);
		let state = start;
		for (let tick = 0; tick < NATURAL_HEALING_FAST_INTERVAL; tick++) {
			state = applyRegenerationTick(state);
		}
		const healed = state.playerHp - start.playerHp;
		expect(healed).toBeGreaterThanOrEqual(1);
		expect(healed).toBeLessThanOrEqual(10 - NATURAL_HEALING_FAST_LEVEL + 1);
		expect(state.rng).not.toEqual(start.rng);
	});

	it("below the fast level it never touches state.rng", () => {
		let state = buildWoundedState(7);
		for (let tick = 0; tick < 30; tick++) {
			state = applyRegenerationTick(state);
		}
		expect(state.rng).toEqual(buildWoundedState(7).rng);
	});

	it("a ring of regeneration heals every single turn, silently", () => {
		const state: GameState = {
			...buildWoundedState(1),
			inventory: [equippedRegenerationRing],
		};
		const next = applyRegenerationTick(state);
		expect(next.playerHp).toBe(state.playerHp + RING_REGEN_AMOUNT);
		expect(next.events).toEqual([]);
		expect(applyRegenerationTick(next).playerHp).toBe(
			state.playerHp + RING_REGEN_AMOUNT * 2,
		);
	});

	it("never heals past playerMaxHp", () => {
		const state: GameState = {
			...buildWoundedState(1),
			playerHp: 100,
			inventory: [equippedRegenerationRing],
		};
		expect(applyRegenerationTick(state).playerHp).toBe(100);
	});

	it("is a no-op (same reference) once the run is no longer playing", () => {
		const state: GameState = {
			...buildWoundedState(1),
			status: "dead",
		};
		expect(applyRegenerationTick(state)).toBe(state);
	});
});
