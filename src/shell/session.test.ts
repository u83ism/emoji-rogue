import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import { recordAction } from "./session.js";

// createSession isn't tested here: it calls loadSavedGameState() with no
// override, always hitting the real ~/.emoji-rogue/save.json path (already
// covered by saveFile.test.ts). recordAction is the pure part.

describe("recordAction", () => {
	const state = buildArenaGameState(5, 4, 1);
	const action = { type: "wait" } as const;

	it("advances the state via the reducer", () => {
		const session = { state, replay: undefined, saveWasCorrupted: false };
		const next = recordAction(session, action);
		expect(next.state).not.toBe(state);
	});

	it("appends to the replay when one is being recorded", () => {
		const replay = { width: 5, height: 4, seed: 1, actions: [] };
		const session = { state, replay, saveWasCorrupted: false };
		const next = recordAction(session, action);
		expect(next.replay).toEqual({ ...replay, actions: [action] });
	});

	it("leaves the replay undefined for a resumed (unrecorded) session", () => {
		const session = { state, replay: undefined, saveWasCorrupted: false };
		const next = recordAction(session, action);
		expect(next.replay).toBeUndefined();
	});

	it("preserves saveWasCorrupted across the action", () => {
		const session = { state, replay: undefined, saveWasCorrupted: true };
		const next = recordAction(session, action);
		expect(next.saveWasCorrupted).toBe(true);
	});
});
