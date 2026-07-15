import {
	ENEMY_EXPERIENCE_REWARD,
	SNEAK_ATTACK_MULTIPLIER,
	WAND_STRIKE_DAMAGE,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { applyExperienceGain } from "./experience.js";
import type { Enemy, GameState, Position } from "./state.js";

/** Orthogonal adjacency — the melee reach, matching 4-direction movement. */
export const isAdjacent = (left: Position, right: Position): boolean =>
	Math.abs(left.x - right.x) + Math.abs(left.y - right.y) === 1;

/**
 * The player's bump attack resolved against one enemy: damage comes from
 * `state.playerAttackDamage` (base plus any swords used so far), multiplied
 * by SNEAK_ATTACK_MULTIPLIER when the target is still asleep. A kill removes
 * the enemy; a surviving target wakes up (sneak attack or not — a normal hit
 * on an already-awake enemy is a no-op on `awake`). The player does not
 * move — attacking is what the movement turn was spent on.
 */
export const applyPlayerAttack = (
	state: GameState,
	target: Enemy,
): GameState => {
	const isSneakAttack = !target.awake;
	const damage = isSneakAttack
		? state.playerAttackDamage * SNEAK_ATTACK_MULTIPLIER
		: state.playerAttackDamage;
	const remainingHp = target.hp - damage;
	const events: GameEvent[] = [
		isSneakAttack
			? { type: "sneak-attack", payload: { target: target.kind, damage } }
			: { type: "enemy-hit", payload: { target: target.kind, damage } },
	];
	if (remainingHp <= 0) {
		events.push({ type: "enemy-defeated", payload: { target: target.kind } });
	}

	const enemies =
		remainingHp <= 0
			? state.enemies.filter((enemy) => enemy !== target)
			: state.enemies.map((enemy) =>
					enemy === target ? { ...enemy, hp: remainingHp, awake: true } : enemy,
				);
	const next: GameState = {
		...state,
		enemies,
		hasAttacked: true,
		events: buildEventLog(state.events, events),
	};
	return remainingHp <= 0
		? applyExperienceGain(next, ENEMY_EXPERIENCE_REWARD[target.kind])
		: next;
};

/**
 * A wand of striking's fixed-damage ranged hit against `target`, resolved
 * the same way applyPlayerAttack resolves melee — a kill removes the enemy,
 * a survivor wakes up — but with none of its player-strength or sneak-attack
 * dependence: WAND_STRIKE_DAMAGE is flat regardless of state.playerAttackDamage
 * or whether `target` was asleep. The player does not move; only advanceTurn's
 * caller decides whether the target was even reachable (visible) to aim at.
 */
export const applyWandStrike = (state: GameState, target: Enemy): GameState => {
	const remainingHp = target.hp - WAND_STRIKE_DAMAGE;
	const events: GameEvent[] = [
		{
			type: "wand-struck",
			payload: { target: target.kind, damage: WAND_STRIKE_DAMAGE },
		},
	];
	if (remainingHp <= 0) {
		events.push({ type: "enemy-defeated", payload: { target: target.kind } });
	}

	const enemies =
		remainingHp <= 0
			? state.enemies.filter((enemy) => enemy !== target)
			: state.enemies.map((enemy) =>
					enemy === target ? { ...enemy, hp: remainingHp, awake: true } : enemy,
				);
	const next: GameState = {
		...state,
		enemies,
		hasAttacked: true,
		events: buildEventLog(state.events, events),
	};
	return remainingHp <= 0
		? applyExperienceGain(next, ENEMY_EXPERIENCE_REWARD[target.kind])
		: next;
};
