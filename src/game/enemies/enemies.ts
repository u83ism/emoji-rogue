import { encodePointKey } from "../../pointkey.js";
import { stepUniform } from "../../rng.js";
import {
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	WAKE_CHANCE_PERCENT,
} from "../balance.js";
import { isAdjacent } from "../combat/combat.js";
import { buildEventLog } from "../events.js";
import { hasEquippedRing } from "../items/rings.js";
import type { Enemy, GameState } from "../state.js";
import { computeVisiblePoints, resolveViewRadius } from "../vision.js";
import { type EnemyTurnProgress, resolveEnemyAction } from "./action.js";
import { canFlyAgain } from "./enemyFlight.js";
import { isHeldByFlytrap } from "./flytrapHold.js";

/**
 * One turn for every enemy, in array order. A still-sleeping enemy wakes
 * this turn only while adjacent/visible, via a WAKE_CHANCE_PERCENT roll (STEALTH_RING_WAKE_CHANCE_PERCENT
 * with a stealth ring worn). Once awake it takes one action per turn —
 * what that action is (attack, steal and flee, chase, wander, a kind's own
 * special case) lives in action.ts's resolveEnemyAction. The flying kinds
 * (bat, kestrel, griffin) take a second action while they are still away
 * from the player after the first (enemyFlight.ts's canFlyAgain) — original
 * Rogue's only speed difference. A
 * slowedTurnsRemaining > 0 enemy (slow wand) skips its whole turn, just
 * ticking down. No kind heals itself between hits: original Rogue's
 * ISREGEN flag (griffin, troll, vampire) only feeds the player-side status
 * display, never an enemy heal. The player's HP reaching zero ends the run; the enemies
 * after that one still take their turn, but resolveEnemyAction's attack
 * path stops rolling against a dead player.
 */
export const advanceEnemies = (state: GameState): GameState => {
	if (state.enemies.length === 0) {
		return state.flytrapHoldDamage === 0
			? state
			: { ...state, flytrapHoldDamage: 0 };
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
		playerStrength: state.playerStrength,
		playerConfusedTurnsRemaining: state.confusedTurnsRemaining,
		playerParalyzedTurnsRemaining: state.paralyzedTurnsRemaining,
		flytrapHoldDamage: state.flytrapHoldDamage,
		playerAttacked: false,
		goldCollected: state.goldCollected,
		inventory: state.inventory,
		events: [],
		died: false,
	};
	const nextEnemies: Enemy[] = [];
	for (const enemy of state.enemies) {
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		let awake = enemy.awake;
		const canWakeFromSight = visiblePoints.has(
			encodePointKey(enemy.x, enemy.y),
		);
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

		if (progress.died) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push({ ...enemy, awake, confusedTurnsRemaining });
			continue;
		}
		const firstAction = resolveEnemyAction(
			state,
			enemy,
			{ position: enemy, hp: enemy.hp, fled: false },
			progress,
			confused,
			visiblePoints,
			occupied,
		);
		/* a flier still away from the player after acting acts once more */
		const result =
			!firstAction.actor.fled &&
			!firstAction.progress.died &&
			canFlyAgain(enemy.kind, firstAction.actor.position, state.player)
				? resolveEnemyAction(
						state,
						enemy,
						firstAction.actor,
						firstAction.progress,
						confused,
						visiblePoints,
						occupied,
					)
				: firstAction;
		const actor = result.actor;
		progress = result.progress;

		if (actor.fled) {
			continue;
		}
		const next = actor.position;
		occupied.add(encodePointKey(next.x, next.y));
		nextEnemies.push({
			...enemy,
			x: next.x,
			y: next.y,
			hp: actor.hp,
			awake: true,
			confusedTurnsRemaining,
		});
	}

	return {
		...state,
		playerHp: Math.max(0, progress.playerHp),
		playerMaxHp: progress.playerMaxHp,
		playerStrength: progress.playerStrength,
		/* an attack on the player, landed or not, ends the quiet natural healing waits for */
		quietTurns: progress.playerAttacked ? 0 : state.quietTurns,
		confusedTurnsRemaining: progress.playerConfusedTurnsRemaining,
		paralyzedTurnsRemaining: progress.playerParalyzedTurnsRemaining,
		/* the hold only builds while a flytrap still has the player — killing it, or being carried off, starts over */
		flytrapHoldDamage: isHeldByFlytrap(nextEnemies, state.player)
			? progress.flytrapHoldDamage
			: 0,
		goldCollected: progress.goldCollected,
		inventory: progress.inventory,
		enemies: nextEnemies,
		events: buildEventLog(state.events, progress.events),
		rng: progress.rng,
		status: progress.died ? "dead" : state.status,
	};
};
