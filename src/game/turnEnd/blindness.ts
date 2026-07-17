import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Ticks blindTurnsRemaining down by one (floored at 0), logging
 * blindness-faded the turn it reaches 0. Deterministic — the countdown
 * itself is the whole effect (the actual field-of-view shrinkage lives in
 * vision.ts's resolveViewRadius, derived from this field every time
 * visibility is computed). Called alongside applyHungerTick/
 * applyConfusionTick/etc. after every turn-consuming action. A no-op once
 * the run is no longer playing, for the same reason those are.
 */
export const applyBlindnessTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.blindTurnsRemaining <= 0) {
		return state;
	}

	const blindTurnsRemaining = state.blindTurnsRemaining - 1;
	if (blindTurnsRemaining > 0) {
		return { ...state, blindTurnsRemaining };
	}

	return {
		...state,
		blindTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "blindness-faded", payload: {} },
		]),
	};
};
