import { SNEAK_ATTACK_MULTIPLIER } from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
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
	return { ...state, enemies, events: buildEventLog(state.events, events) };
};
