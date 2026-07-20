import { SLOW_WAND_DURATION } from "../balance.js";
import { applyMagicMissileWandStrike, applyWandStrike } from "../combat.js";
import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";
import { applyEnemyTeleport } from "../teleport.js";
import { findNearestVisibleEnemy } from "../vision.js";

/**
 * A wand of striking hits the nearest visible enemy for flat damage. With no
 * visible target it is a no-op — same reference, no turn spent, wand not
 * consumed, matching how using an unheld item behaves. Consumption from
 * inventory happens in the dispatcher (items/use.ts).
 */
export const applyUseStrikingWand = (state: GameState): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return applyWandStrike(state, target);
};

/**
 * A wand of slow monster freezes the nearest visible enemy for
 * SLOW_WAND_DURATION turns. Same no-visible-target no-op as the striking wand.
 */
export const applyUseSlowWand = (state: GameState): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			enemy === target
				? { ...enemy, slowedTurnsRemaining: SLOW_WAND_DURATION }
				: enemy,
		),
		events: buildEventLog(state.events, [
			{
				type: "enemy-slowed",
				payload: { target: target.kind, turns: SLOW_WAND_DURATION },
			},
		]),
	};
};

/**
 * A teleport wand forcibly relocates the nearest visible enemy to a random
 * floor tile and wakes it. Same no-visible-target no-op as the other wands.
 */
export const applyUseTeleportWand = (state: GameState): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return applyEnemyTeleport(state, target);
};

/**
 * A magic missile wand hits the nearest visible enemy for flat
 * MAGIC_MISSILE_WAND_DAMAGE — same no-visible-target no-op as the other wands.
 */
export const applyUseMagicMissileWand = (state: GameState): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return applyMagicMissileWandStrike(state, target);
};
