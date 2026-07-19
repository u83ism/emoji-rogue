import { createRng } from "../../rng.js";
import { RING_REGEN_CHANCE_PERCENT } from "../balance.js";
import { buildEventLog } from "../events.js";
import { hasEquippedRing } from "../items/rings.js";
import type { GameState } from "../state.js";

/**
 * A no-op unless a ring of regeneration is currently equipped and playerHp
 * is below the cap. Otherwise rolls RING_REGEN_CHANCE_PERCENT (consuming
 * state.rng either way, win or lose, the same stateful-Rng wrap pattern as
 * descendStairs and the sword/armor curse roll) and heals 1 HP with a
 * player-regenerated event on success. Called alongside applyHungerTick
 * after every turn-consuming action. A no-op once the run is no longer
 * playing, for the same reason applyHungerTick is.
 */
export const applyRegenerationTick = (state: GameState): GameState => {
	if (
		state.status !== "playing" ||
		!hasEquippedRing(state.inventory, "regeneration-ring") ||
		state.playerHp >= state.playerMaxHp
	) {
		return state;
	}

	const rng = createRng(1).setState(state.rng);
	const healed = rng.getUniformInt(0, 99) < RING_REGEN_CHANCE_PERCENT;
	if (!healed) {
		return { ...state, rng: rng.getState() };
	}

	return {
		...state,
		playerHp: state.playerHp + 1,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "player-regenerated", payload: { amount: 1 } },
		]),
	};
};
