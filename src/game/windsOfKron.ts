import {
	GOAL_FLOOR,
	WINDS_OF_KRON_EVICTION_TURNS,
	WINDS_OF_KRON_WARNING_TURNS,
} from "./balance.js";
import { buildEventLog } from "./events.js";
import { descendStairs } from "./floor.js";
import type { GameState } from "./state.js";

/**
 * A per-floor loitering clock: warns, then forcibly descends the player to
 * the next floor once they linger too long on one level (an anti-scumming
 * device, "Winds of Kron" in Shiren the Wanderer). Exempt on GOAL_FLOOR and
 * beyond — a forced descendStairs there would generate a floor past the
 * amulet's floor, breaking the "GOAL_FLOOR only has stairs up" invariant.
 */
export const applyWindsOfKronTick = (state: GameState): GameState => {
	if (state.status !== "playing" || state.floor >= GOAL_FLOOR) {
		return state;
	}
	const turnsOnCurrentFloor = state.turnsOnCurrentFloor + 1;
	if (turnsOnCurrentFloor >= WINDS_OF_KRON_EVICTION_TURNS) {
		return descendStairs({
			...state,
			turnsOnCurrentFloor,
			events: buildEventLog(state.events, [
				{ type: "winds-of-kron-eviction", payload: {} },
			]),
		});
	}
	if (turnsOnCurrentFloor === WINDS_OF_KRON_WARNING_TURNS) {
		return {
			...state,
			turnsOnCurrentFloor,
			events: buildEventLog(state.events, [
				{ type: "winds-of-kron-warning", payload: {} },
			]),
		};
	}
	return { ...state, turnsOnCurrentFloor };
};
