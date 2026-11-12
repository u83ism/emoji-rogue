import { encodePointKey } from "../../pointkey.js";
import { stepUniform } from "../../rng.js";
import {
	ENEMY_ACTIONS_PER_TURN,
	ENEMY_MAX_HP,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	WAKE_CHANCE_PERCENT,
} from "../balance.js";
import { isAdjacent } from "../combat.js";
import { buildEventLog } from "../events.js";
import { hasEquippedRing } from "../items/rings.js";
import type { Enemy, GameState } from "../state.js";
import { computeVisiblePoints, resolveViewRadius } from "../vision.js";
import {
	type EnemyActor,
	type EnemyTurnProgress,
	resolveEnemyAction,
} from "./action.js";
import { resolveEnemyRegen } from "./enemyRegen.js";

/**
 * One turn for every enemy, in array order. A still-sleeping enemy wakes
 * this turn only while adjacent/visible (icky-thing: adjacent only — it is
 * blind), via a WAKE_CHANCE_PERCENT roll (STEALTH_RING_WAKE_CHANCE_PERCENT
 * with a stealth ring worn). Once awake it takes ENEMY_ACTIONS_PER_TURN[kind]
 * actions — what one action is (attack, steal and flee, chase, wander, a
 * kind's own special case) lives in action.ts's resolveEnemyAction. A
 * slowedTurnsRemaining > 0 enemy (slow wand) skips its whole turn, just
 * ticking down. Griffin and troll additionally regenerate HP every awake
 * turn regardless of action (enemyRegen.ts), independent of whether they
 * landed a hit. The player's HP reaching zero ends the run and cuts short
 * any remaining actions.
 */
export const advanceEnemies = (state: GameState): GameState => {
	if (state.enemies.length === 0) {
		return state;
	}

	const visiblePoints = computeVisiblePoints(
		state.terrain,
		state.player,
		resolveViewRadius(state),
	);
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);

	let progress: EnemyTurnProgress = {
		rng: state.rng,
		playerHp: state.playerHp,
		playerMaxHp: state.playerMaxHp,
		playerConfusedTurnsRemaining: state.confusedTurnsRemaining,
		goldCollected: state.goldCollected,
		inventory: state.inventory,
		events: [],
		died: false,
	};
	const nextEnemies: Enemy[] = [];
	for (const enemy of state.enemies) {
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		let awake = enemy.awake;
		const canWakeFromSight =
			enemy.kind !== "icky-thing" &&
			visiblePoints.has(encodePointKey(enemy.x, enemy.y));
		if (!awake && (isAdjacent(enemy, state.player) || canWakeFromSight)) {
			const wakeChancePercent = hasEquippedRing(
				progress.inventory,
				"stealth-ring",
			)
				? STEALTH_RING_WAKE_CHANCE_PERCENT
				: WAKE_CHANCE_PERCENT;
			const roll = stepUniform(progress.rng);
			progress = { ...progress, rng: roll.state };
			awake = roll.value < wakeChancePercent / 100;
		}
		if (!awake) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push(enemy);
			continue;
		}

		/* Decided from this turn's still-undecremented value (same idiom as
		 * slowedTurnsRemaining below) — the scroll's own application turn
		 * already wanders instead of chasing. */
		const confused = enemy.confusedTurnsRemaining > 0;
		const confusedTurnsRemaining = Math.max(
			0,
			enemy.confusedTurnsRemaining - 1,
		);

		if (enemy.slowedTurnsRemaining > 0) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push({
				...enemy,
				awake,
				slowedTurnsRemaining: enemy.slowedTurnsRemaining - 1,
				confusedTurnsRemaining,
			});
			continue;
		}

		let actor: EnemyActor = { position: enemy, hp: enemy.hp, fled: false };
		for (
			let action = 0;
			action < ENEMY_ACTIONS_PER_TURN[enemy.kind] &&
			!progress.died &&
			!actor.fled;
			action++
		) {
			const result = resolveEnemyAction(
				state,
				enemy,
				actor,
				progress,
				confused,
				visiblePoints,
				occupied,
			);
			actor = result.actor;
			progress = result.progress;
		}

		const regen = resolveEnemyRegen(
			enemy.kind,
			actor.hp,
			ENEMY_MAX_HP[enemy.kind],
		);
		if (regen.event !== undefined) {
			progress = { ...progress, events: [...progress.events, regen.event] };
		}

		if (actor.fled) {
			continue;
		}
		const next = actor.position;
		occupied.add(encodePointKey(next.x, next.y));
		nextEnemies.push({
			...enemy,
			x: next.x,
			y: next.y,
			hp: regen.hp,
			awake: true,
			confusedTurnsRemaining,
		});
	}

	return {
		...state,
		playerHp: Math.max(0, progress.playerHp),
		playerMaxHp: progress.playerMaxHp,
		confusedTurnsRemaining: progress.playerConfusedTurnsRemaining,
		goldCollected: progress.goldCollected,
		inventory: progress.inventory,
		enemies: nextEnemies,
		events: buildEventLog(state.events, progress.events),
		rng: progress.rng,
		status: progress.died ? "dead" : state.status,
	};
};
