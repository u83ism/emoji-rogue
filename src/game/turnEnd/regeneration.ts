import { createRng } from "../../rng.js";
import {
	NATURAL_HEALING_FAST_INTERVAL,
	NATURAL_HEALING_FAST_LEVEL,
	NATURAL_HEALING_SLOW_THRESHOLD,
	RING_REGEN_AMOUNT,
} from "../balance.js";
import { findWornRings } from "../items/rings.js";
import type { GameState } from "../state.js";

/**
 * Original Rogue's doctor() daemon, run after every turn-consuming action:
 * quietTurns (turns since the last fight — combat.ts and enemies.ts reset
 * it) goes up by one, and the player heals on their own once it has been
 * quiet long enough. Below NATURAL_HEALING_FAST_LEVEL that is 1 HP whenever
 * quietTurns + 2 x level exceeds NATURAL_HEALING_SLOW_THRESHOLD (every 19
 * turns at level 1, every 7 at level 7); from that level on, every
 * NATURAL_HEALING_FAST_INTERVAL quiet turns heal 1..(level - 7) HP, rolled
 * on state.rng. Each worn ring of regeneration adds RING_REGEN_AMOUNT every
 * turn on top. Any healing resets quietTurns — so with the ring on, a low-level
 * player heals by the ring alone, exactly as in the original. Silent: no
 * event, the HP readout is the feedback. A no-op once the run is no longer
 * playing, for the same reason applyHungerTick is.
 */
export const applyRegenerationTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	const quietTurns = state.quietTurns + 1;
	const ringHealing =
		findWornRings(state.inventory).filter(
			(ring) => ring.kind === "regeneration-ring",
		).length * RING_REGEN_AMOUNT;

	if (state.playerLevel < NATURAL_HEALING_FAST_LEVEL) {
		const naturalHealing =
			quietTurns + state.playerLevel * 2 > NATURAL_HEALING_SLOW_THRESHOLD
				? 1
				: 0;
		const healing = naturalHealing + ringHealing;
		return healing === 0
			? { ...state, quietTurns }
			: {
					...state,
					playerHp: Math.min(state.playerMaxHp, state.playerHp + healing),
					quietTurns: 0,
				};
	}

	if (quietTurns < NATURAL_HEALING_FAST_INTERVAL) {
		return ringHealing === 0
			? { ...state, quietTurns }
			: {
					...state,
					playerHp: Math.min(state.playerMaxHp, state.playerHp + ringHealing),
					quietTurns: 0,
				};
	}
	const rng = createRng(1).setState(state.rng);
	const naturalHealing = rng.getUniformInt(
		1,
		state.playerLevel - NATURAL_HEALING_FAST_LEVEL + 1,
	);
	return {
		...state,
		playerHp: Math.min(
			state.playerMaxHp,
			state.playerHp + naturalHealing + ringHealing,
		),
		quietTurns: 0,
		rng: rng.getState(),
	};
};
