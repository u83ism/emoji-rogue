import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Ticks hallucinatingTurnsRemaining down by one (floored at 0), logging
 * hallucination-faded the turn it reaches 0. Same shape as
 * applyBlindnessTick — the countdown itself is the whole effect; the actual
 * glyph substitution lives in frame.ts's resolveHallucinatedGlyph, derived
 * from this field every time a frame is drawn.
 */
export const applyHallucinationTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.hallucinatingTurnsRemaining <= 0) {
		return state;
	}

	const hallucinatingTurnsRemaining = state.hallucinatingTurnsRemaining - 1;
	if (hallucinatingTurnsRemaining > 0) {
		return { ...state, hallucinatingTurnsRemaining };
	}

	return {
		...state,
		hallucinatingTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "hallucination-faded", payload: {} },
		]),
	};
};
