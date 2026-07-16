import { FOOD_RATION_RESTORE_AMOUNT, PLAYER_MAX_FOOD } from "../balance.js";
import { buildEventLog } from "../events.js";
import type { GameState, InventoryEntry } from "../state.js";

/**
 * Eating a food ration restores food up to the cap (eating at full satiety
 * wastes it) and breaks the "foodless" conduct for good (see calculateScore).
 */
export const applyUseFood = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => {
	const restored = Math.min(
		FOOD_RATION_RESTORE_AMOUNT,
		PLAYER_MAX_FOOD - state.playerFood,
	);
	return {
		...state,
		playerFood: state.playerFood + restored,
		hasEaten: true,
		inventory,
		events: buildEventLog(state.events, [
			{ type: "player-ate", payload: { amount: restored } },
		]),
	};
};
