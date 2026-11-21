import { createRng } from "../../rng.js";
import {
	HOLD_MONSTER_SCROLL_RANGE,
	SLEEP_SCROLL_TURNS_MAX,
	SLEEP_SCROLL_TURNS_MIN,
} from "../balance.js";
import { buildEventLog, type GameEvent, POTION_KINDS } from "../events.js";
import { buildSpawnedEnemy, drawEnemyKindForFloor } from "../floor/enemies.js";
import type { GameState, Position } from "../state.js";
import { applyRandomTeleport } from "../teleport.js";
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
 * A confuse monster scroll, as original Rogue's read_scroll(): the player's
 * hands begin to glow (CANHUH), and the next monster they hit is confused
 * — see combat/combat.ts's applyEnemyHit. Always used up.
 */
export const applyUseConfuseMonsterScroll = (state: GameState): GameState => ({
	...state,
	nextHitConfuses: true,
	events: buildEventLog(state.events, [{ type: "hands-glowing", payload: {} }]),
});

/**
 * A hold monster scroll, as original Rogue's read_scroll(): every awake
 * monster within HOLD_MONSTER_SCROLL_RANGE tiles of the player (either
 * axis, seen or not) stops where it stands — held, doing nothing at all
 * until the player attacks or zaps it (enemies.ts). Asleep ones are left
 * alone. With none in range the scroll is wasted.
 */
export const applyUseHoldMonsterScroll = (state: GameState): GameState => {
	const targets = state.enemies.filter(
		(enemy) =>
			enemy.awake &&
			!enemy.held &&
			Math.abs(enemy.x - state.player.x) <= HOLD_MONSTER_SCROLL_RANGE &&
			Math.abs(enemy.y - state.player.y) <= HOLD_MONSTER_SCROLL_RANGE,
	);
	if (targets.length === 0) {
		return applyScrollWasted(state, "hold-monster-scroll");
	}
	const targetSet = new Set(targets);
	const events: GameEvent[] = targets.map((target) => ({
		type: "enemy-held",
		payload: { target: target.kind },
	}));
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			targetSet.has(enemy) ? { ...enemy, held: true } : enemy,
		),
		events: buildEventLog(state.events, events),
	};
};

/** Original Rogue's sleep scroll: asleep for SLEEP_SCROLL_TURNS_MIN..MAX turns, the run flag gone. */
export const applyUseSleepScroll = (state: GameState): GameState => {
	const rng = createRng(1).setState(state.rng);
	const turns = rng.getUniformInt(
		SLEEP_SCROLL_TURNS_MIN,
		SLEEP_SCROLL_TURNS_MAX,
	);
	return {
		...state,
		paralyzedTurnsRemaining: state.paralyzedTurnsRemaining + turns,
		playerRunFlag: false,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "player-fell-asleep", payload: { turns } },
		]),
	};
};

/**
 * Original Rogue's create monster scroll: a new monster of this floor's
 * kinds on one of the free tiles next to the player, each as likely
 * (rnd(++i) == 0), asleep like any newly made monster. With no free tile
 * there is only "a faint cry of anguish in the distance".
 */
export const applyUseCreateMonsterScroll = (state: GameState): GameState => {
	const free: Position[] = [];
	for (let x = state.player.x - 1; x <= state.player.x + 1; x++) {
		for (let y = state.player.y - 1; y <= state.player.y + 1; y++) {
			const open =
				state.terrain[x]?.[y] === 0 &&
				!(x === state.player.x && y === state.player.y) &&
				!state.enemies.some((enemy) => enemy.x === x && enemy.y === y);
			if (open) {
				free.push({ x, y });
			}
		}
	}
	const rng = createRng(1).setState(state.rng);
	const tile =
		free.length > 0 ? free[rng.getUniformInt(0, free.length - 1)] : undefined;
	if (tile === undefined) {
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "monster-created", payload: { target: undefined } },
			]),
		};
	}
	const kind = drawEnemyKindForFloor(rng, state.floor);
	const enemy = buildSpawnedEnemy(kind, tile, rng, state.floor);
	return {
		...state,
		enemies: [...state.enemies, enemy],
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "monster-created", payload: { target: kind } },
		]),
	};
};

/** Original Rogue's aggravate monsters scroll (aggravate()): every monster on the floor wakes and comes for the player. */
export const applyUseAggravateMonstersScroll = (
	state: GameState,
): GameState => ({
	...state,
	enemies: state.enemies.map((enemy) => ({
		...enemy,
		awake: true,
		held: false,
	})),
	events: buildEventLog(state.events, [
		{ type: "monsters-aggravated", payload: {} },
	]),
});
