import { describe, expect, it } from "vitest";
import {
	GOAL_FLOOR,
	WINDS_OF_KRON_EVICTION_TURNS,
	WINDS_OF_KRON_WARNING_TURNS,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyWindsOfKronTick } from "./windsOfKron.js";

describe("applyWindsOfKronTick", () => {
	it("counts turnsOnCurrentFloor up by one without firing an event below the warning threshold", () => {
		const state = buildArenaGameState(5, 5, 1);
		const next = applyWindsOfKronTick(state);
		expect(next.turnsOnCurrentFloor).toBe(1);
		expect(next.events).toEqual([]);
	});

	it("fires winds-of-kron-warning exactly at the warning threshold", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			turnsOnCurrentFloor: WINDS_OF_KRON_WARNING_TURNS - 1,
		};
		const next = applyWindsOfKronTick(state);
		expect(next.turnsOnCurrentFloor).toBe(WINDS_OF_KRON_WARNING_TURNS);
		expect(next.events).toEqual([
			{ type: "winds-of-kron-warning", payload: {} },
		]);
	});

	it("forcibly descends and resets turnsOnCurrentFloor at the eviction threshold", () => {
		const state: GameState = {
			...buildArenaGameState(40, 20, 1),
			floor: 3,
			turnsOnCurrentFloor: WINDS_OF_KRON_EVICTION_TURNS - 1,
		};
		const next = applyWindsOfKronTick(state);
		expect(next.floor).toBe(4);
		expect(next.turnsOnCurrentFloor).toBe(0);
		expect(
			next.events.some((event) => event.type === "winds-of-kron-eviction"),
		).toBe(true);
		expect(next.events.some((event) => event.type === "floor-descended")).toBe(
			true,
		);
	});

	it("is exempt on GOAL_FLOOR and beyond — never evicts past it", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			floor: GOAL_FLOOR,
			turnsOnCurrentFloor: WINDS_OF_KRON_EVICTION_TURNS,
		};
		expect(applyWindsOfKronTick(state)).toBe(state);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			turnsOnCurrentFloor: WINDS_OF_KRON_EVICTION_TURNS,
			status: "dead",
		};
		expect(applyWindsOfKronTick(state)).toBe(state);
	});
});
