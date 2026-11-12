import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyStatusCountdownTicks } from "./statusCountdowns.js";

const COUNTDOWNS = [
	["confusedTurnsRemaining", "confusion-faded"],
	["levitationTurnsRemaining", "levitation-faded"],
	["blindTurnsRemaining", "blindness-faded"],
	["paralyzedTurnsRemaining", "paralysis-faded"],
	["detectMonstersTurnsRemaining", "detect-monsters-faded"],
	["hallucinatingTurnsRemaining", "hallucination-faded"],
] as const;

describe("applyStatusCountdownTicks", () => {
	it("is a no-op (same reference) when no countdown is active", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyStatusCountdownTicks(state)).toBe(state);
	});

	describe.each(COUNTDOWNS)("%s", (field, fadedEventType) => {
		it("counts down by one without firing an event above 0", () => {
			const state: GameState = { ...buildArenaGameState(5, 5, 1), [field]: 3 };
			const next = applyStatusCountdownTicks(state);
			expect(next[field]).toBe(2);
			expect(next.events).toEqual([]);
		});

		it("fires its faded event the turn it reaches 0", () => {
			const state: GameState = { ...buildArenaGameState(5, 5, 1), [field]: 1 };
			const next = applyStatusCountdownTicks(state);
			expect(next[field]).toBe(0);
			expect(next.events).toEqual([{ type: fadedEventType, payload: {} }]);
		});

		it("never touches rng — the countdown itself is deterministic", () => {
			const state: GameState = { ...buildArenaGameState(5, 5, 1), [field]: 5 };
			expect(applyStatusCountdownTicks(state).rng).toEqual(state.rng);
		});

		it("is a no-op once the run is no longer playing", () => {
			const state: GameState = {
				...buildArenaGameState(5, 5, 1),
				[field]: 3,
				status: "dead",
			};
			expect(applyStatusCountdownTicks(state)).toBe(state);
		});
	});

	it("ticks every active countdown in the same turn, fading in field order", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			confusedTurnsRemaining: 1,
			blindTurnsRemaining: 4,
			hallucinatingTurnsRemaining: 1,
		};
		const next = applyStatusCountdownTicks(state);
		expect(next.confusedTurnsRemaining).toBe(0);
		expect(next.blindTurnsRemaining).toBe(3);
		expect(next.hallucinatingTurnsRemaining).toBe(0);
		expect(next.events).toEqual([
			{ type: "confusion-faded", payload: {} },
			{ type: "hallucination-faded", payload: {} },
		]);
	});
});
