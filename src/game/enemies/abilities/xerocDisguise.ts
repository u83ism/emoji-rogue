import type { Rng } from "../../../rng.js";
import { AMULET_FLOOR } from "../../balance.js";
import { buildEventLog } from "../../events.js";
import type { Enemy, GameState } from "../../state.js";
import type { EnemyTurnProgress } from "../turn/action.js";

/**
 * What a xeroc passes itself off as — original Rogue's rnd_thing(): one of
 * these, the amulet only from AMULET_FLOOR down (the last entry, left out
 * of the draw above it).
 */
export const XEROC_DISGUISES = [
	"potion",
	"scroll",
	"ring",
	"wand",
	"food",
	"weapon",
	"armor",
	"stairs",
	"gold",
	"amulet",
] as const;

export type XerocDisguise = (typeof XEROC_DISGUISES)[number];

/** A newborn xeroc's disguise on `floor` (original Rogue's new_monster() calling rnd_thing()). Consumes `rng` once. */
export const drawXerocDisguise = (rng: Rng, floor: number): XerocDisguise => {
	const count =
		floor >= AMULET_FLOOR ? XEROC_DISGUISES.length : XEROC_DISGUISES.length - 1;
	const disguise = XEROC_DISGUISES[rng.getUniformInt(0, count - 1)];
	if (disguise === undefined) {
		throw new Error("unreachable: the index is drawn within XEROC_DISGUISES");
	}
	return disguise;
};

/** Whether fighting the player drops `enemy`'s disguise: it wears one and the player can see (original Rogue's fight()/attack() check ISBLIND). */
export const isXerocUnmasked = (
	state: Pick<GameState, "blindTurnsRemaining">,
	enemy: Enemy,
): boolean => enemy.disguise !== undefined && state.blindTurnsRemaining === 0;

/** `enemy` with its disguise dropped. */
export const removeDisguise = (enemy: Enemy): Enemy => {
	const { disguise: _dropped, ...revealed } = enemy;
	return revealed;
};

/**
 * The player swinging at or throwing at a disguised xeroc, as original
 * Rogue's fight(): before any roll, the xeroc wakes (runto()) and, unless
 * the player is blind, its disguise drops with xeroc-revealed ("wait!
 * That's a xeroc!"). Returns the state and the target as it stands in it.
 */
export const applyXerocUnmasking = (
	state: GameState,
	target: Enemy,
): { readonly state: GameState; readonly target: Enemy } => {
	if (!isXerocUnmasked(state, target)) {
		return { state, target };
	}
	const revealed: Enemy = {
		...removeDisguise(target),
		awake: true,
		held: false,
	};
	return {
		state: {
			...state,
			enemies: state.enemies.map((enemy) =>
				enemy === target ? revealed : enemy,
			),
			quietTurns: 0,
			events: buildEventLog(state.events, [
				{ type: "xeroc-revealed", payload: {} },
			]),
		},
		target: revealed,
	};
};

/**
 * One enemy's turn folded into the running progress (enemies.ts), as
 * original Rogue's attack(): `after` is the turn run from `before` with
 * playerAttacked cleared, so it tells whether this enemy fought the player.
 * If it was a disguised xeroc and the player can see, xeroc-revealed goes
 * in ahead of what it did, and `unmasked` tells the caller to drop the
 * disguise.
 */
export const mergeXerocUnmasking = (
	state: GameState,
	enemy: Enemy,
	before: EnemyTurnProgress,
	after: EnemyTurnProgress,
): { readonly progress: EnemyTurnProgress; readonly unmasked: boolean } => {
	const unmasked = after.playerAttacked && isXerocUnmasked(state, enemy);
	return {
		progress: {
			...after,
			playerAttacked: before.playerAttacked || after.playerAttacked,
			events: unmasked
				? [
						...before.events,
						{ type: "xeroc-revealed", payload: {} },
						...after.events.slice(before.events.length),
					]
				: after.events,
		},
		unmasked,
	};
};
