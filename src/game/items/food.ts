import { stepUniform } from "../../rng.js";
import {
	FOOD_RATION_RESTORE_MAX,
	FOOD_RATION_RESTORE_MIN,
	PLAYER_MAX_FOOD,
} from "../balance.js";
import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Eating a food ration, as in original Rogue's eat(): a starving stomach
 * (playerFood below 0) first comes back to 0, then gains
 * FOOD_RATION_RESTORE_MIN..MAX (rolled on state.rng), capped at
 * PLAYER_MAX_FOOD. Consumption from inventory happens in the dispatcher
 * (items/use.ts).
 */
export const applyUseFood = (state: GameState): GameState => {
	const roll = stepUniform(state.rng);
	const restoreAmount =
		FOOD_RATION_RESTORE_MIN +
		Math.floor(
			roll.value * (FOOD_RATION_RESTORE_MAX - FOOD_RATION_RESTORE_MIN + 1),
		);
	const before = Math.max(0, state.playerFood);
	const playerFood = Math.min(PLAYER_MAX_FOOD, before + restoreAmount);
	return {
		...state,
		playerFood,
		rng: roll.state,
		events: buildEventLog(state.events, [
			{ type: "player-ate", payload: { amount: playerFood - before } },
		]),
	};
};
