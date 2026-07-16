import { encodePointKey } from "../../pointkey.js";
import { SLOW_WAND_DURATION } from "../balance.js";
import { applyWandStrike } from "../combat.js";
import { buildEventLog } from "../events.js";
import type { Enemy, GameState, InventoryEntry } from "../state.js";
import { computeVisiblePoints, resolveViewRadius } from "../vision.js";

/**
 * The closest (Manhattan distance) enemy currently in the player's field of
 * view, or undefined if none are visible — a wand's automatic aim, standing
 * in for a manual targeting UI this project deliberately doesn't have
 * (docs/design.md's single-key interaction rule).
 */
const findNearestVisibleEnemy = (state: GameState): Enemy | undefined => {
	const visiblePoints = computeVisiblePoints(
		state.terrain,
		state.player,
		resolveViewRadius(state),
	);
	const visibleEnemies = state.enemies.filter((enemy) =>
		visiblePoints.has(encodePointKey(enemy.x, enemy.y)),
	);
	return visibleEnemies.reduce<Enemy | undefined>((closest, candidate) => {
		if (closest === undefined) {
			return candidate;
		}
		const candidateDistance =
			Math.abs(candidate.x - state.player.x) +
			Math.abs(candidate.y - state.player.y);
		const closestDistance =
			Math.abs(closest.x - state.player.x) +
			Math.abs(closest.y - state.player.y);
		return candidateDistance < closestDistance ? candidate : closest;
	}, undefined);
};

/**
 * A wand of striking hits the nearest visible enemy for flat damage. With no
 * visible target it is a no-op — same reference, no turn spent, wand not
 * consumed, matching how using an unheld item behaves.
 */
export const applyUseStrikingWand = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return applyWandStrike({ ...state, inventory }, target);
};

/**
 * A wand of slow monster freezes the nearest visible enemy for
 * SLOW_WAND_DURATION turns. Same no-visible-target no-op as the striking wand.
 */
export const applyUseSlowWand = (
	state: GameState,
	inventory: readonly InventoryEntry[],
): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return {
		...state,
		inventory,
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
