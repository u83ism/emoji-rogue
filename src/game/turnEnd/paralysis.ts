import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

export const applyParalysisTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.paralyzedTurnsRemaining <= 0) {
		return state;
	}
	const paralyzedTurnsRemaining = state.paralyzedTurnsRemaining - 1;
	if (paralyzedTurnsRemaining > 0) {
		return { ...state, paralyzedTurnsRemaining };
	}
	return {
		...state,
		paralyzedTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "paralysis-faded", payload: {} },
		]),
	};
};
