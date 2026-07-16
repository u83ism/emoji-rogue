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
 * The shared back half of every player-sourced hit: `damage` applied to
 * `target`, `hitEvent` logged, a kill removing the enemy (with enemy-defeated
 * and experience), a survivor waking up, and the "pacifist" conduct broken
 * either way. Only how the damage and the event are produced differs between
 * melee and wand — the callers below.
 */
const applyEnemyHit = (
	state: GameState,
	target: Enemy,
	damage: number,
	hitEvent: GameEvent,
): GameState => {
	const remainingHp = target.hp - damage;
	const events: GameEvent[] = [hitEvent];
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
 * The player's bump attack resolved against one enemy: damage comes from
 * `state.playerAttackDamage` (base plus any swords used so far), multiplied
 * by SNEAK_ATTACK_MULTIPLIER when the target is still asleep. The player
 * does not move — attacking is what the movement turn was spent on.
 */
export const applyPlayerAttack = (
	state: GameState,
	target: Enemy,
): GameState => {
	const isSneakAttack = !target.awake;
	const damage = isSneakAttack
		? state.playerAttackDamage * SNEAK_ATTACK_MULTIPLIER
		: state.playerAttackDamage;
	return applyEnemyHit(
		state,
		target,
		damage,
		isSneakAttack
			? { type: "sneak-attack", payload: { target: target.kind, damage } }
			: { type: "enemy-hit", payload: { target: target.kind, damage } },
	);
};

/**
 * A wand of striking's fixed-damage ranged hit against `target`:
 * WAND_STRIKE_DAMAGE is flat regardless of state.playerAttackDamage or
 * whether `target` was asleep (no sneak-attack multiplier at range). The
 * player does not move; only the caller decides whether the target was even
 * reachable (visible) to aim at.
 */
export const applyWandStrike = (state: GameState, target: Enemy): GameState =>
	applyEnemyHit(state, target, WAND_STRIKE_DAMAGE, {
		type: "wand-struck",
		payload: { target: target.kind, damage: WAND_STRIKE_DAMAGE },
	});
