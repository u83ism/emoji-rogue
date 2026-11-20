import {
	CONFUSE_MONSTER_SCROLL_DURATION,
	HOLD_MONSTER_SCROLL_DURATION,
} from "../balance.js";
import { buildEventLog, type GameEvent, POTION_KINDS } from "../events.js";
import type { GameState } from "../state.js";
import { applyRandomTeleport } from "../teleport.js";
import { findNearestVisibleEnemy, findVisibleEnemies } from "../vision.js";
import { applyScrollWasted } from "./equipmentScrolls.js";

// The area/environment-affecting scroll kinds — see equipmentScrolls.ts for
// the weapon/armor-targeting ones, split out once this file passed the
// 200-line structure-lint limit (milestone 94 follow-up). Consumption from
// inventory happens in the dispatcher (items/use.ts), never in the handlers
// here — a handler only applies its effect.

/** A teleport scroll relocates the player exactly like a teleport trap does. */
export const applyUseTeleportScroll = (state: GameState): GameState =>
	applyRandomTeleport(state, "teleport-scroll");

/** A magic mapping scroll reveals the whole floor as explored. */
export const applyUseMappingScroll = (state: GameState): GameState => ({
	...state,
	explored: state.terrain.map((column) => column.map(() => true)),
	events: buildEventLog(state.events, [{ type: "floor-mapped", payload: {} }]),
});

/**
 * An identify scroll (original Rogue's identify potion scroll, whatis())
 * reveals the kind of the held potion `targetItemId` points at — the
 * player picks it (inventoryKeymap.ts's filterScrollTargets). With no
 * potion pointed at, the scroll is wasted, as the original's "you don't
 * have anything appropriate to identify". Picking one already identified
 * still uses the scroll up.
 */
export const applyUseIdentifyScroll = (
	state: GameState,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item) => item.itemId === targetItemId && POTION_KINDS.includes(item.kind),
	);
	if (target === undefined) {
		return applyScrollWasted(state, "identify-scroll");
	}
	return {
		...state,
		identifiedItemKinds: state.identifiedItemKinds.includes(target.kind)
			? state.identifiedItemKinds
			: [...state.identifiedItemKinds, target.kind],
		events: buildEventLog(state.events, [
			{ type: "potion-identified", payload: { kind: target.kind } },
		]),
	};
};

/**
 * A confuse monster scroll sets the nearest visible enemy's
 * confusedTurnsRemaining — see advanceEnemies for what that does to its
 * chase decision. Same no-visible-target no-op as the wands.
 */
export const applyUseConfuseMonsterScroll = (state: GameState): GameState => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined) {
		return state;
	}
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			enemy === target
				? {
						...enemy,
						confusedTurnsRemaining: CONFUSE_MONSTER_SCROLL_DURATION,
					}
				: enemy,
		),
		events: buildEventLog(state.events, [
			{
				type: "enemy-confused",
				payload: {
					target: target.kind,
					turns: CONFUSE_MONSTER_SCROLL_DURATION,
				},
			},
		]),
	};
};

/**
 * A hold monster scroll freezes every currently visible enemy at once
 * (reusing the slow wand's Enemy.slowedTurnsRemaining — no new state field),
 * unlike the single-target wands/scrolls above. No-op with nothing visible.
 */
export const applyUseHoldMonsterScroll = (state: GameState): GameState => {
	const targets = findVisibleEnemies(state);
	if (targets.length === 0) {
		return state;
	}
	const targetSet = new Set(targets);
	const events: GameEvent[] = targets.map((target) => ({
		type: "enemy-held",
		payload: { target: target.kind, turns: HOLD_MONSTER_SCROLL_DURATION },
	}));
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			targetSet.has(enemy)
				? { ...enemy, slowedTurnsRemaining: HOLD_MONSTER_SCROLL_DURATION }
				: enemy,
		),
		events: buildEventLog(state.events, events),
	};
};
