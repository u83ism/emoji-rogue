import { DIRECTION_VECTORS } from "../../directions.js";
import { buildEventLog } from "../../events.js";
import type { Direction, GameState } from "../../state.js";
import { applyEnemyTeleport } from "../../teleport.js";
import { traceFlight } from "../../throw.js";

/**
 * A teleport wand forcibly relocates the first monster its bolt meets to a
 * random floor tile and wakes it — aimed like the slow wand.
 */
export const applyUseTeleportWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState => {
	if (direction === undefined) {
		return state;
	}
	const { target } = traceFlight(state, direction);
	if (target === undefined) {
		/* the bolt met only a wall: the charge is spent all the same */
		return { ...state };
	}
	return applyEnemyTeleport(state, target);
};

/**
 * A teleport to wand, as original Rogue's do_zap() (WS_TELTO): the monster
 * its bolt meets is brought to the tile next to the player in the zapped
 * direction, awake and after them. Aimed like the slow wand.
 */
export const applyUseTeleportToWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState => {
	if (direction === undefined) {
		return state;
	}
	const { target } = traceFlight(state, direction);
	if (target === undefined) {
		/* the bolt met only a wall: the charge is spent all the same */
		return { ...state };
	}
	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const destination = {
		x: state.player.x + deltaX,
		y: state.player.y + deltaY,
	};
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			enemy === target
				? { ...enemy, ...destination, awake: true, held: false }
				: enemy,
		),
		events: buildEventLog(state.events, [
			{ type: "enemy-pulled", payload: { target: target.kind } },
		]),
	};
};
