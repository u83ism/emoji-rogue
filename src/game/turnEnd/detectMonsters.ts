import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

export const applyDetectMonstersTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.detectMonstersTurnsRemaining <= 0) {
		return state;
	}
	const detectMonstersTurnsRemaining = state.detectMonstersTurnsRemaining - 1;
	if (detectMonstersTurnsRemaining > 0) {
		return { ...state, detectMonstersTurnsRemaining };
	}
	return {
		...state,
		detectMonstersTurnsRemaining: 0,
		events: buildEventLog(state.events, [
			{ type: "detect-monsters-faded", payload: {} },
		]),
	};
};
