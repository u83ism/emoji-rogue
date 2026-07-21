import { encodePointKey } from "../pointkey.js";
import { stepUniform } from "../rng.js";
import {
	AQUATOR_RUST_CHANCE_PERCENT,
	ENEMY_ACTIONS_PER_TURN,
	ENEMY_ATTACK_DAMAGE,
	ENEMY_MAX_HP,
	MIN_DAMAGE_TAKEN,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	WAKE_CHANCE_PERCENT,
} from "./balance.js";
import { isAdjacent } from "./combat.js";
import { resolveFleeingTheft } from "./enemyFlee.js";
import { stepTowardPlayer, stepWandering } from "./enemyMovement.js";
import { buildEventLog, type GameEvent } from "./events.js";
import {
	applyArmorRust,
	calculatePlayerDefense,
	canRustEquippedArmor,
} from "./items/equipment.js";
import { hasEquippedRing } from "./items/rings.js";
import type { Enemy, GameState, HeldItem, Position } from "./state.js";
import { resolveVampireLifesteal } from "./vampireLifesteal.js";
import { computeVisiblePoints, resolveViewRadius } from "./vision.js";

/**
 * One turn for every enemy, in array order. A still-sleeping enemy wakes
 * this turn only while adjacent/visible, via a WAKE_CHANCE_PERCENT roll
 * (STEALTH_RING_WAKE_CHANCE_PERCENT with a stealth ring worn) — not
 * guaranteed, leaving room for a sneak attack. Once awake it acts
 * ENEMY_ACTIONS_PER_TURN[kind] times: adjacent attacks in place (damage from
 * balance.ts, reduced by calculatePlayerDefense but never below
 * MIN_DAMAGE_TAKEN) — except thief/nymph, which flee after stealing instead
 * (enemyFlee.ts's resolveFleeingTheft); aquator, whose landed hits also roll
 * AQUATOR_RUST_CHANCE_PERCENT to rust the equipped armor; and vampire, which
 * heals off its own landed hits (vampireLifesteal.ts, capped at
 * ENEMY_MAX_HP.vampire). A slowedTurnsRemaining > 0 enemy (slow wand) skips
 * its whole action, just ticking down. Non-adjacent enemies chase via A*
 * while visible and not confused (confusedTurnsRemaining > 0 — confuse
 * monster scroll — forces wandering instead; adjacent attacks are
 * unaffected), or wander otherwise. The player's HP reaching zero ends the
 * run and cuts short any remaining actions.
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
	let goldCollected = state.goldCollected;
	let inventory: readonly HeldItem[] = state.inventory;
	let died = false;
	const events: GameEvent[] = [];
	const nextEnemies: Enemy[] = [];
	for (const enemy of state.enemies) {
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		let awake = enemy.awake;
		if (
			!awake &&
			(isAdjacent(enemy, state.player) ||
				visiblePoints.has(encodePointKey(enemy.x, enemy.y)))
		) {
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
				const damage = Math.max(
					MIN_DAMAGE_TAKEN,
					ENEMY_ATTACK_DAMAGE[enemy.kind] - calculatePlayerDefense(inventory),
				);
				playerHp -= damage;
				events.push({
					type: "player-hit",
					payload: { by: enemy.kind, damage },
				});
				if (enemy.kind === "aquator" && canRustEquippedArmor(inventory)) {
					const rustRoll = stepUniform(rng);
					rng = rustRoll.state;
					if (rustRoll.value < AQUATOR_RUST_CHANCE_PERCENT / 100) {
						inventory = applyArmorRust(inventory);
						events.push({ type: "armor-rusted", payload: { amount: 1 } });
					}
				}
				if (enemy.kind === "vampire") {
					const lifesteal = resolveVampireLifesteal(
						currentHp,
						ENEMY_MAX_HP.vampire,
						damage,
					);
					currentHp = lifesteal.hp;
					if (lifesteal.event !== undefined) {
						events.push(lifesteal.event);
					}
				}
				if (playerHp <= 0) {
					died = true;
					events.push({ type: "player-died", payload: { by: enemy.kind } });
				}
			} else if (
				!confused &&
				visiblePoints.has(encodePointKey(next.x, next.y))
			) {
				const step = stepTowardPlayer(state, next, occupied);
				next = step ?? next;
			} else {
				const wandered = stepWandering(state, next, occupied, rng);
				next = wandered.position;
				rng = wandered.rng;
			}
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
		goldCollected,
		inventory,
		enemies: nextEnemies,
		events: buildEventLog(state.events, events),
		rng,
		status: died ? "dead" : state.status,
	};
};
