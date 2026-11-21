import {
	calculateEnemyLevelBonus,
	calculateMagicSaveChancePercent,
	MAGIC_MISSILE_DAMAGE_BONUS,
	MAGIC_MISSILE_DAMAGE_DICE,
} from "../balance.js";
import { applyEnemyHit } from "../combat/combat.js";
import { rollDamageDice, rollToHit } from "../combat/damage.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import { buildEventLog } from "../events.js";
import type { Direction, Enemy, GameState } from "../state.js";
import { applyEnemyTeleport } from "../teleport.js";
import { traceFlight } from "../throw.js";
import { nameEnemy } from "../vision.js";
import { calculatePlayerDamageBonus } from "./equipmentStats.js";

/**
 * A wand of slow monster on the nearest visible enemy, as original Rogue's
 * do_zap(): a hasted one only loses its haste, any other is slowed for good
 * — acting every other move, starting with the next (enemies/enemySpeed.ts).
 * Either way the zap wakes it and breaks a hold (runto()). The bolt flies
 * `direction` (original Rogue's do_zap()) to the first monster or wall
 * (throw.ts's traceFlight); meeting no monster, the charge is spent for
 * nothing. Without a direction it is a no-op — same reference, no turn
 * spent (every wand here does the same). Consumption from inventory happens in the dispatcher
 * (items/use.ts).
 */
export const applyUseSlowWand = (
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
	const wasHasted = target.speed === "hasted";
	return {
		...state,
		enemies: state.enemies.map((enemy) =>
			enemy === target
				? {
						...enemy,
						speed: wasHasted ? "normal" : "slowed-acting",
						awake: true,
						held: false,
					}
				: enemy,
		),
		events: buildEventLog(state.events, [
			{
				type: wasHasted ? "enemy-slowed-removed" : "enemy-slowed",
				payload: { target: target.kind },
			},
		]),
	};
};

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
 * A wand of magic missile's bolt against `target`, as original Rogue's
 * do_zap(): the target first gets a save against magic for its level
 * (calculateMagicSaveChancePercent) — a pass makes the missile vanish
 * (magic-missile-vanished, the target left asleep or awake as it was).
 * Otherwise the bolt never misses (its +100 to hit) and deals
 * MAGIC_MISSILE_DAMAGE_DICE + MAGIC_MISSILE_DAMAGE_BONUS + the player's
 * damage bonus (strength and the wielded weapon's — roll_em() treats the
 * bolt as launched from whatever is wielded). The player does not move; only
 * the caller decides whether the target was even reachable (visible).
 */
export const applyMagicMissileWandStrike = (
	state: GameState,
	target: Enemy,
): GameState => {
	const save = rollToHit(
		state.rng,
		calculateMagicSaveChancePercent(
			ENEMY_STATS[target.kind].level + calculateEnemyLevelBonus(state.floor),
		),
	);
	if (save.hit) {
		return {
			...state,
			rng: save.rng,
			events: buildEventLog(state.events, [
				{
					type: "magic-missile-vanished",
					payload: { target: nameEnemy(state, target) },
				},
			]),
		};
	}
	const diceRoll = rollDamageDice(
		save.rng,
		MAGIC_MISSILE_DAMAGE_DICE,
		MAGIC_MISSILE_DAMAGE_BONUS + calculatePlayerDamageBonus(state),
		0,
	);
	return applyEnemyHit(
		{ ...state, rng: diceRoll.rng },
		target,
		diceRoll.damage,
		{
			type: "wand-struck",
			payload: { target: nameEnemy(state, target), damage: diceRoll.damage },
		},
	);
};

/**
 * A magic missile wand fires `direction` at the first monster in the way
 * (applyMagicMissileWandStrike) — aimed like the slow wand.
 */
export const applyUseMagicMissileWand = (
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
	return applyMagicMissileWandStrike(state, target);
};
