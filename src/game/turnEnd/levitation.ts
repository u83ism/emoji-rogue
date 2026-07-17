import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Ticks levitationTurnsRemaining down by one (floored at 0), logging
 * levitation-faded the turn it reaches 0. Deterministic — the countdown
 * itself is the whole effect. Called alongside applyHungerTick/
 * applyConfusionTick/etc. after every turn-consuming action. A no-op once
 * the run is no longer playing, for the same reason those are.
 */
export const applyLevitationTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.levitationTurnsRemaining <= 0) {
		return state;
	}

	const levitationTurnsRemaining = state.levitationTurnsRemaining - 1;
	if (levitationTurnsRemaining > 0) {
		return { ...state, levitationTurnsRemaining };
	}

	return {
		...state,
		levitationTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "levitation-faded", payload: {} },
		]),
	};
};
