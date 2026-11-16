import { describe, expect, it } from "vitest";
import {
	FAINT_TURNS_MAX,
	FAINT_TURNS_MIN,
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_WEAK_THRESHOLD,
	REGENERATION_RING_FOOD_COST,
	STARVATION_TURNS,
	STEALTH_RING_FOOD_COST,
} from "../balance.js";
import type { ItemKind } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState, HeldItem } from "../state.js";
import { applyHungerTick } from "./hunger.js";

const equippedRing = (
	kind: Extract<
		ItemKind,
		"sustenance-ring" | "regeneration-ring" | "stealth-ring"
	>,
): HeldItem => ({ itemId: 1, kind, equipped: true, cursed: false });

const buildState = (playerFood: number): GameState => ({
	...buildArenaGameState(5, 5, 1),
	playerFood,
});

/** Ticks `state` until `isDone`, returning the state it stopped on. */
const tickUntil = (
	start: GameState,
	isDone: (state: GameState) => boolean,
): GameState => {
	let state = start;
	for (let tick = 0; tick < 5000; tick++) {
		if (isDone(state)) {
			return state;
		}
		state = applyHungerTick(state);
	}
	throw new Error("the condition never became true within 5000 ticks");
};

describe("applyHungerTick", () => {
	it("starts a run at original Rogue's 1300 and drops by one a turn, with no event and no rng", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(state.playerFood).toBe(1300);
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(1299);
		expect(next.events).toEqual([]);
		expect(next.rng).toEqual(state.rng);
	});

	it("fires player-hungry exactly once, the turn food crosses the warning threshold", () => {
		const state = buildState(PLAYER_HUNGER_WARNING_THRESHOLD + 1);
		const next = applyHungerTick(state);
		expect(next.events).toEqual([{ type: "player-hungry", payload: {} }]);
		expect(applyHungerTick(next).events).toEqual(next.events);
	});

	it("fires player-weak exactly once, the turn food crosses PLAYER_WEAK_THRESHOLD", () => {
		const state = buildState(PLAYER_WEAK_THRESHOLD + 1);
		const next = applyHungerTick(state);
		expect(next.events).toEqual([{ type: "player-weak", payload: {} }]);
		expect(applyHungerTick(next).events).toEqual(next.events);
	});

	it("a ring of regeneration and a ring of stealth burn extra food every turn", () => {
		const regenerating = {
			...buildState(1000),
			inventory: [equippedRing("regeneration-ring")],
		};
		expect(applyHungerTick(regenerating).playerFood).toBe(
			1000 - 1 - REGENERATION_RING_FOOD_COST,
		);
		const sneaking = {
			...buildState(1000),
			inventory: [equippedRing("stealth-ring")],
		};
		expect(applyHungerTick(sneaking).playerFood).toBe(
			1000 - 1 - STEALTH_RING_FOOD_COST,
		);
	});

	it("still fires the warning when a ring's extra cost jumps over the threshold", () => {
		const state = {
			...buildState(PLAYER_HUNGER_WARNING_THRESHOLD + 2),
			inventory: [equippedRing("regeneration-ring")],
		};
		expect(applyHungerTick(state).events).toEqual([
			{ type: "player-hungry", payload: {} },
		]);
	});

	it("a ring of sustenance saves about half the turns' food, rolling rng every turn", () => {
		let state: GameState = {
			...buildState(1000),
			inventory: [equippedRing("sustenance-ring")],
		};
		const startRng = state.rng;
		for (let tick = 0; tick < 400; tick++) {
			state = applyHungerTick(state);
		}
		const spent = 1000 - state.playerFood;
		expect(spent).toBeGreaterThan(150);
		expect(spent).toBeLessThan(250);
		expect(state.rng).not.toEqual(startRng);
	});

	it("an empty stomach keeps counting below zero instead of dealing damage", () => {
		const state = buildState(0);
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(-1);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.status).toBe("playing");
	});

	it("while starving, sooner or later the player faints for 4-11 turns", () => {
		const fainted = tickUntil(
			buildState(0),
			(state) => state.paralyzedTurnsRemaining > 0,
		);
		expect(fainted.paralyzedTurnsRemaining).toBeGreaterThanOrEqual(
			FAINT_TURNS_MIN,
		);
		expect(fainted.paralyzedTurnsRemaining).toBeLessThanOrEqual(
			FAINT_TURNS_MAX,
		);
		expect(fainted.events.at(-1)).toEqual({
			type: "player-fainted",
			payload: { turns: fainted.paralyzedTurnsRemaining },
		});
	});

	it("does not roll for another faint while already out cold", () => {
		const state = { ...buildState(-10), paralyzedTurnsRemaining: 5 };
		const next = applyHungerTick(state);
		expect(next.playerFood).toBe(-11);
		expect(next.paralyzedTurnsRemaining).toBe(5);
		expect(next.rng).toEqual(state.rng);
		expect(next.events).toEqual([]);
	});

	it("starves to death once the stomach has been empty for more than STARVATION_TURNS", () => {
		const lastTurn = {
			...buildState(-STARVATION_TURNS),
			paralyzedTurnsRemaining: 5,
		};
		expect(applyHungerTick(lastTurn).status).toBe("playing");

		const dead = applyHungerTick({
			...buildState(-STARVATION_TURNS - 1),
			paralyzedTurnsRemaining: 5,
		});
		expect(dead.status).toBe("dead");
		expect(dead.playerHp).toBe(0);
		expect(dead.events).toEqual([
			{ type: "player-died", payload: { by: "hunger" } },
		]);
	});

	it("a ring of sustenance does not slow starvation", () => {
		const state = {
			...buildState(-5),
			paralyzedTurnsRemaining: 5,
			inventory: [equippedRing("sustenance-ring")],
		};
		expect(applyHungerTick(state).playerFood).toBe(-6);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = { ...buildState(500), status: "dead" };
		expect(applyHungerTick(state)).toBe(state);
	});
});
