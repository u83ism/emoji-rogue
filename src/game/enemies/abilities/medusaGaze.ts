import { stepUniform } from "../../../rng.js";
import {
	CONFUSION_POTION_DURATION,
	calculatePlayerMagicSaveChancePercent,
} from "../../balance.js";
import { buildEventLog } from "../../events.js";
import { sumRingBonus } from "../../items/equipment/equipmentStats.js";
import type { Enemy, GameState } from "../../state.js";
import { findPlayerRoom } from "../../vision.js";

/** Original Rogue's LAMPDIST: how near (squared distance below this) a medusa must be to gaze from the dark. */
const LAMP_DISTANCE_SQUARED = 3;

interface GazeResult {
	readonly state: GameState;
	readonly enemy: Enemy;
}

/**
 * The medusa's part of original Rogue's wake_monster(): an awake medusa
 * that has not gazed yet (ISFOUND) looks at a player who can see and is
 * not hallucinating — standing in a lit room, or close by — once. The
 * player resists with a save against magic; otherwise they are confused
 * for spread(HUHDURATION) turns, added on if already confused.
 */
export const applyMedusaGaze = (state: GameState, enemy: Enemy): GazeResult => {
	const deltaX = enemy.x - state.player.x;
	const deltaY = enemy.y - state.player.y;
	const room = findPlayerRoom(state);
	const inReach =
		(room !== undefined && !room.dark) ||
		deltaX * deltaX + deltaY * deltaY < LAMP_DISTANCE_SQUARED;
	if (
		enemy.kind !== "medusa" ||
		!enemy.awake ||
		enemy.gazeUsed ||
		enemy.cancelled ||
		state.blindTurnsRemaining > 0 ||
		state.hallucinatingTurnsRemaining > 0 ||
		!inReach
	) {
		return { state, enemy };
	}
	const looked = { ...enemy, gazeUsed: true };
	const save = stepUniform(state.rng);
	if (
		save.value * 100 <
		calculatePlayerMagicSaveChancePercent(
			state.playerLevel,
			sumRingBonus(state.inventory, "protection-ring"),
		)
	) {
		return { state: { ...state, rng: save.state }, enemy: looked };
	}
	/* spread(HUHDURATION): 20 - 20/20 + rnd(20/10) */
	const spread = stepUniform(save.state);
	const base = CONFUSION_POTION_DURATION;
	const turns =
		base -
		Math.floor(base / 20) +
		Math.floor(spread.value * Math.floor(base / 10));
	return {
		state: {
			...state,
			rng: spread.state,
			confusedTurnsRemaining: state.confusedTurnsRemaining + turns,
			events: buildEventLog(state.events, [
				{ type: "player-gazed", payload: { turns } },
			]),
		},
		enemy: looked,
	};
};
