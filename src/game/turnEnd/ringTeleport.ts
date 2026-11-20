import { createRng } from "../../rng.js";
import { TELEPORTATION_RING_CHANCE_DENOMINATOR } from "../balance.js";
import { findWornRings } from "../items/rings.js";
import type { GameState } from "../state.js";
import { applyRandomTeleport } from "../teleport.js";

/**
 * Original Rogue's command(), after the daemons: each hand with a ring of
 * teleportation jumps the player to a random spot with a 1 in
 * TELEPORTATION_RING_CHANCE_DENOMINATOR chance (left hand first — the
 * first worn ring in pack order). A no-op, rng untouched, with no such
 * ring worn or the run over.
 */
export const applyTeleportationRingTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	return findWornRings(state.inventory)
		.filter((ring) => ring.kind === "teleportation-ring")
		.reduce((current) => {
			const rng = createRng(1).setState(current.rng);
			const jumps =
				rng.getUniformInt(0, TELEPORTATION_RING_CHANCE_DENOMINATOR - 1) === 0;
			const rolled = { ...current, rng: rng.getState() };
			return jumps ? applyRandomTeleport(rolled, "teleportation-ring") : rolled;
		}, state);
};
