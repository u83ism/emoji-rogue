import { createRng } from "../rng.js";
import {
	ENEMY_EXPERIENCE_REWARD,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	MAGIC_MISSILE_WAND_DAMAGE,
	SNEAK_ATTACK_MULTIPLIER,
	WAND_STRIKE_DAMAGE,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { applyExperienceGain } from "./experience.js";
import { calculatePlayerAttackDamage } from "./items/equipment.js";
import type { Enemy, GameState, Position } from "./state.js";

/**
 * An orc's gold hoard, dropped straight into goldCollected the instant it
 * dies — no GoldPile entity involved, unlike gold found on the floor.
 * Consumes state.rng via the same "temporarily wake a stateful Rng" pattern
 * as teleport.ts's applyRandomTeleport.
 */
const applyOrcGoldDrop = (state: GameState): GameState => {
	const rng = createRng(1).setState(state.rng);
	const amount = rng.getUniformInt(GOLD_AMOUNT_MIN, GOLD_AMOUNT_MAX);
	return {
		...state,
		goldCollected: state.goldCollected + amount,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "orc-gold-drop", payload: { amount } },
		]),
	};
};

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
	if (remainingHp > 0) {
		return next;
	}
	const withExperience = applyExperienceGain(
		next,
		ENEMY_EXPERIENCE_REWARD[target.kind],
	);
	return target.kind === "orc"
		? applyOrcGoldDrop(withExperience)
		: withExperience;
};

/**
 * The player's bump attack resolved against one enemy: damage comes from
 * calculatePlayerAttackDamage (playerPower plus the equipped sword's own
 * attackBonus, if any), multiplied by SNEAK_ATTACK_MULTIPLIER when the
 * target is still asleep. The player does not move — attacking is what the
 * movement turn was spent on.
 */
export const applyPlayerAttack = (
	state: GameState,
	target: Enemy,
): GameState => {
	const isSneakAttack = !target.awake;
	const attackDamage = calculatePlayerAttackDamage(state);
	const damage = isSneakAttack
		? attackDamage * SNEAK_ATTACK_MULTIPLIER
		: attackDamage;
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
 * WAND_STRIKE_DAMAGE is flat regardless of the player's own attack damage or
 * whether `target` was asleep (no sneak-attack multiplier at range). The
 * player does not move; only the caller decides whether the target was even
 * reachable (visible) to aim at.
 */
export const applyWandStrike = (state: GameState, target: Enemy): GameState =>
	applyEnemyHit(state, target, WAND_STRIKE_DAMAGE, {
		type: "wand-struck",
		payload: { target: target.kind, damage: WAND_STRIKE_DAMAGE },
	});

/**
 * A wand of magic missile's fixed-damage ranged hit — same shape as
 * applyWandStrike (shared applyEnemyHit core, no sneak-attack multiplier),
 * just a higher flat MAGIC_MISSILE_WAND_DAMAGE.
 */
export const applyMagicMissileWandStrike = (
	state: GameState,
	target: Enemy,
): GameState =>
	applyEnemyHit(state, target, MAGIC_MISSILE_WAND_DAMAGE, {
		type: "wand-struck",
		payload: { target: target.kind, damage: MAGIC_MISSILE_WAND_DAMAGE },
	});
