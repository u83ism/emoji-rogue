import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { GameState } from "../game/state.js";
import {
	createInitialBotMemory,
	isCyclingInPlace,
	updateMemoryForTurn,
} from "./memory.js";

const baseState = (): GameState => buildArenaGameState(9, 9, 1);

describe("createInitialBotMemory", () => {
	it("starts on floor 1 with no goal, blacklist, history or stagnation", () => {
		expect(createInitialBotMemory()).toEqual({
			floor: 1,
			goal: undefined,
			blacklistedGoals: new Set(),
			recentPositionKeys: [],
			lastProgressSignature: "",
			stagnantTurns: 0,
		});
	});
});

describe("updateMemoryForTurn", () => {
	it("appends the current position and resets the stagnation counter on the first turn", () => {
		const state = { ...baseState(), player: { x: 4, y: 4 } };
		const memory = updateMemoryForTurn(state, createInitialBotMemory());
		expect(memory.recentPositionKeys).toEqual(["4,4"]);
		expect(memory.stagnantTurns).toBe(0);
	});

	it("increments stagnantTurns when nothing measurable has changed", () => {
		const state = { ...baseState(), player: { x: 4, y: 4 } };
		const first = updateMemoryForTurn(state, createInitialBotMemory());
		const second = updateMemoryForTurn(state, first);
		const third = updateMemoryForTurn(state, second);
		expect(second.stagnantTurns).toBe(1);
		expect(third.stagnantTurns).toBe(2);
	});

	it("resets stagnantTurns once gold collected changes", () => {
		const state = { ...baseState(), player: { x: 4, y: 4 } };
		const first = updateMemoryForTurn(state, createInitialBotMemory());
		const second = updateMemoryForTurn(state, first);
		const richerState = { ...state, goldCollected: 5 };
		const third = updateMemoryForTurn(richerState, second);
		expect(second.stagnantTurns).toBe(1);
		expect(third.stagnantTurns).toBe(0);
	});

	it("clears the goal, blacklist and position history on a floor change", () => {
		const previousMemory = {
			...createInitialBotMemory(),
			floor: 1,
			goal: { kind: "stairs" as const, x: 1, y: 1 },
			blacklistedGoals: new Set(["2,2"]),
			recentPositionKeys: ["1,1", "1,2"],
		};
		const state = { ...baseState(), floor: 2, player: { x: 5, y: 5 } };
		const memory = updateMemoryForTurn(state, previousMemory);
		expect(memory.floor).toBe(2);
		expect(memory.goal).toBeUndefined();
		expect(memory.blacklistedGoals.size).toBe(0);
		expect(memory.recentPositionKeys).toEqual(["5,5"]);
	});
});

describe("isCyclingInPlace", () => {
	it("is false with too little history", () => {
		const memory = { ...createInitialBotMemory(), recentPositionKeys: ["1,1"] };
		expect(isCyclingInPlace(memory)).toBe(false);
	});

	it("is true once the current tile has been revisited enough times", () => {
		const memory = {
			...createInitialBotMemory(),
			recentPositionKeys: [
				"1,1",
				"2,1",
				"1,1",
				"2,1",
				"1,1",
				"2,1",
				"1,1",
				"2,1",
				"1,1",
				"2,1",
				"1,1",
			],
		};
		expect(isCyclingInPlace(memory)).toBe(true);
	});

	it("is false when the revisits stay under the threshold", () => {
		const memory = {
			...createInitialBotMemory(),
			recentPositionKeys: ["1,1", "2,1", "3,1", "1,1", "4,1"],
		};
		expect(isCyclingInPlace(memory)).toBe(false);
	});
});
