import { encodePointKey } from "../pointkey.js";
import { stepUniform } from "../rng.js";
import {
	ENEMY_ACTIONS_PER_TURN,
	ENEMY_MAX_HP,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	WAKE_CHANCE_PERCENT,
} from "./balance.js";
import { isAdjacent } from "./combat.js";
import { resolveFleeingTheft } from "./enemyFlee.js";
import { resolveEnemyHitLanded } from "./enemyHitLanded.js";
import { resolveEnemyMovement } from "./enemyMovement.js";
import { resolveEnemyRegen } from "./enemyRegen.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { hasEquippedRing } from "./items/rings.js";
import type { Enemy, GameState, HeldItem, Position } from "./state.js";
import { computeVisiblePoints, resolveViewRadius } from "./vision.js";

/**
 * One turn for every enemy, in array order. A still-sleeping enemy wakes
 * this turn only while adjacent/visible (icky-thing: adjacent only — it is
 * blind), via a WAKE_CHANCE_PERCENT roll (STEALTH_RING_WAKE_CHANCE_PERCENT
 * with a stealth ring worn). Once awake it acts ENEMY_ACTIONS_PER_TURN[kind]
 * times: adjacent hits resolve via enemyHitLanded.ts (base damage plus each
 * kind's own extra effect — aquator's rust, vampire's lifesteal, wraith's
 * permanent playerMaxHp drain) — except thief/nymph, which flee after
 * stealing instead (enemyFlee.ts); non-adjacent enemies resolve via
 * enemyMovement.ts's resolveEnemyMovement (chase/wander, or venus-flytrap's
 * stationary/medusa's ranged gaze special cases). A slowedTurnsRemaining > 0
 * enemy (slow wand) skips its whole action, just ticking down. Griffin and
 * troll additionally regenerate HP every awake turn regardless of action
 * (enemyRegen.ts), independent of whether they landed a hit. The player's HP
 * reaching zero ends the run and cuts short any remaining actions.
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

	let rng = state.rng;
	let playerHp = state.playerHp;
	let playerMaxHp = state.playerMaxHp;
	let playerConfusedTurnsRemaining = state.confusedTurnsRemaining;
	let goldCollected = state.goldCollected;
	let inventory: readonly HeldItem[] = state.inventory;
	let died = false;
	const events: GameEvent[] = [];
	const nextEnemies: Enemy[] = [];
	for (const enemy of state.enemies) {
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		let awake = enemy.awake;
		const canWakeFromSight =
			enemy.kind !== "icky-thing" &&
			visiblePoints.has(encodePointKey(enemy.x, enemy.y));
		if (!awake && (isAdjacent(enemy, state.player) || canWakeFromSight)) {
			const wakeChancePercent = hasEquippedRing(inventory, "stealth-ring")
				? STEALTH_RING_WAKE_CHANCE_PERCENT
				: WAKE_CHANCE_PERCENT;
			const roll = stepUniform(rng);
			rng = roll.state;
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

		let next: Position = enemy;
		let currentHp = enemy.hp;
		let fled = false;
		for (
			let action = 0;
			action < ENEMY_ACTIONS_PER_TURN[enemy.kind] && !died && !fled;
			action++
		) {
			if (isAdjacent(next, state.player)) {
				if (enemy.kind === "thief" || enemy.kind === "nymph") {
					const result = resolveFleeingTheft(
						enemy.kind,
						rng,
						goldCollected,
						inventory,
					);
					rng = result.rng;
					goldCollected = result.goldCollected;
					inventory = result.inventory;
					events.push(result.event);
					fled = true;
					continue;
				}
				const hit = resolveEnemyHitLanded(
					enemy,
					currentHp,
					playerHp,
					playerMaxHp,
					inventory,
					rng,
				);
				currentHp = hit.enemyHp;
				playerHp = hit.playerHp;
				playerMaxHp = hit.playerMaxHp;
				inventory = hit.inventory;
				rng = hit.rng;
				for (const event of hit.events) {
					events.push(event);
				}
				if (hit.died) {
					died = true;
				}
			} else {
				const movement = resolveEnemyMovement(
					state,
					enemy,
					next,
					occupied,
					visiblePoints,
					confused,
					rng,
				);
				next = movement.position;
				rng = movement.rng;
				if (movement.playerConfusedTurnsRemaining !== undefined) {
					playerConfusedTurnsRemaining = movement.playerConfusedTurnsRemaining;
				}
				if (movement.event !== undefined) {
					events.push(movement.event);
				}
			}
		}

		const regen = resolveEnemyRegen(
			enemy.kind,
			currentHp,
			ENEMY_MAX_HP[enemy.kind],
		);
		currentHp = regen.hp;
		if (regen.event !== undefined) {
			events.push(regen.event);
		}

		if (fled) {
			continue;
		}
		occupied.add(encodePointKey(next.x, next.y));
		nextEnemies.push({
			...enemy,
			x: next.x,
			y: next.y,
			hp: currentHp,
			awake: true,
			confusedTurnsRemaining,
		});
	}

	return {
		...state,
		playerHp: Math.max(0, playerHp),
		playerMaxHp,
		confusedTurnsRemaining: playerConfusedTurnsRemaining,
		goldCollected,
		inventory,
		enemies: nextEnemies,
		events: buildEventLog(state.events, events),
		rng,
		status: died ? "dead" : state.status,
	};
};
