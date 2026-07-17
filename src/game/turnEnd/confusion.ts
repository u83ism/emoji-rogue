import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Ticks confusedTurnsRemaining down by one (floored at 0), logging
 * confusion-faded the turn it reaches 0. Deterministic — unlike
 * applyRegenerationTick, there is nothing to roll: the countdown itself is
 * the whole effect. Called alongside applyHungerTick/applyRegenerationTick
 * after every turn-consuming action. A no-op once the run is no longer
 * playing, for the same reason those are.
 */
export const applyConfusionTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.confusedTurnsRemaining <= 0) {
		return state;
	}

	const confusedTurnsRemaining = state.confusedTurnsRemaining - 1;
	if (confusedTurnsRemaining > 0) {
		return { ...state, confusedTurnsRemaining };
	}

	return {
		...state,
		confusedTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "confusion-faded", payload: {} },
		]),
	};
};
