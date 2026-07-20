import { encodePointKey } from "../pointkey.js";
import { stepUniform } from "../rng.js";
import {
	AQUATOR_RUST_CHANCE_PERCENT,
	ENEMY_ACTIONS_PER_TURN,
	ENEMY_ATTACK_DAMAGE,
	MIN_DAMAGE_TAKEN,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	THIEF_STEAL_AMOUNT,
	WAKE_CHANCE_PERCENT,
} from "./balance.js";
import { isAdjacent } from "./combat.js";
import { stepTowardPlayer, stepWandering } from "./enemyMovement.js";
import { buildEventLog, type GameEvent } from "./events.js";
import {
	applyArmorRust,
	calculatePlayerDefense,
	canRustEquippedArmor,
} from "./items/equipment.js";
import { removeHeldItemAtIndex } from "./items/inventory.js";
import { hasEquippedRing } from "./items/rings.js";
import type { Enemy, GameState, HeldItem, Position } from "./state.js";
import { computeVisiblePoints, resolveViewRadius } from "./vision.js";

/**
 * One turn for every enemy, in array order. A still-sleeping enemy (see
 * Enemy.awake) takes no action at all unless it wakes this turn: while
 * adjacent to the player, or inside the player's field of view (the same
 * `visiblePoints` set used for the chase decision below, reused as a wake
 * check), it rolls WAKE_CHANCE_PERCENT (consuming the state's RNG) each turn
 * until it succeeds — not a guaranteed wake, so a fast enough attack can
 * still land a sneak attack. Once awake, an enemy never sleeps again. Awake
 * enemies act
 * `ENEMY_ACTIONS_PER_TURN[kind]` times (a fast kind like a bat gets two
 * attacks or two steps for the player's one): adjacent to the player attacks
 * in place (damage from balance.ts by kind, reduced by
 * calculatePlayerDefense(inventory) but never below MIN_DAMAGE_TAKEN) —
 * except a thief, which steals up to THIEF_STEAL_AMOUNT gold instead of
 * dealing damage, and a nymph, which steals one random *unequipped* held
 * item instead (equipped items are never stolen; rng-picked among the rest;
 * item-stolen fires with kind: undefined if nothing unequipped was held).
 * Both flee the board for good afterward (never rejoin `nextEnemies`, killed
 * or not). An aquator instead stands its ground: every landed hit
 * additionally rolls AQUATOR_RUST_CHANCE_PERCENT to also knock 1 off the
 * equipped armor's own defenseBonus (armor-rusted, floored at 0), so its
 * later hits in the same fight — this turn's or a future one's — land
 * harder, unless canRustEquippedArmor is false (no armor equipped, or it's
 * rustProtected — see the protect armor scroll), in which case the rust
 * roll is skipped entirely — no rng consumed, no chance of it landing. An
 * awake enemy with slowedTurnsRemaining > 0
 * (see the slow wand) skips this turn's action entirely — no movement, no
 * attack — while the counter ticks down, checked right after the sleep
 * check above. Non-adjacent
 * enemies chase via A* while inside the player's field of view, or wander
 * using (and advancing) the state's RNG. The player's HP reaching zero ends
 * the run and cuts short any remaining actions, this enemy's and the rest of
 * the array's alike.
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

		if (enemy.slowedTurnsRemaining > 0) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push({
				...enemy,
				awake,
				slowedTurnsRemaining: enemy.slowedTurnsRemaining - 1,
			});
			continue;
		}

		let next: Position = enemy;
		let fled = false;
		for (
			let action = 0;
			action < ENEMY_ACTIONS_PER_TURN[enemy.kind] && !died && !fled;
			action++
		) {
			if (isAdjacent(next, state.player)) {
				if (enemy.kind === "thief") {
					const stolen = Math.min(THIEF_STEAL_AMOUNT, goldCollected);
					goldCollected -= stolen;
					events.push({ type: "gold-stolen", payload: { amount: stolen } });
					fled = true;
					continue;
				}
				if (enemy.kind === "nymph") {
					// Only unequipped items are up for grabs — what's worn stays worn.
					const stealable = inventory
						.map((item, itemIndex) => ({ item, itemIndex }))
						.filter(({ item }) => !("equipped" in item && item.equipped));
					if (stealable.length === 0) {
						events.push({ type: "item-stolen", payload: { kind: undefined } });
					} else {
						const pick = stepUniform(rng);
						rng = pick.state;
						const picked = stealable[Math.floor(pick.value * stealable.length)];
						if (picked === undefined) {
							throw new Error("unreachable: pick is within stealable bounds");
						}
						inventory = removeHeldItemAtIndex(inventory, picked.itemIndex);
						events.push({
							type: "item-stolen",
							payload: { kind: picked.item.kind },
						});
					}
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
				if (playerHp <= 0) {
					died = true;
					events.push({ type: "player-died", payload: { by: enemy.kind } });
				}
			} else if (visiblePoints.has(encodePointKey(next.x, next.y))) {
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
		nextEnemies.push({ ...enemy, x: next.x, y: next.y, awake: true });
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
