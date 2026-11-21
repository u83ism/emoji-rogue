import { encodePointKey } from "../../pointkey.js";
import { createRng } from "../../rng.js";
import { buildEventLog } from "../events.js";
import type { Enemy, GameState } from "../state.js";
import { findRoomAt } from "../vision.js";
import type { EnemyTurnProgress } from "./action.js";
import { applyEnemyPickups, findItemGoal } from "./enemyPack.js";
import { resolveEnemyTurnActions } from "./enemySpeed.js";
import { isHeldByFlytrap } from "./flytrapHold.js";

/**
 * One turn for every enemy, in array order. A sleeping enemy does nothing —
 * what wakes one is wakeMonster.ts (and attacks, wands, scrolls). An awake
 * one takes one action per turn —
 * what that action is (attack, steal and flee, chase, wander, a kind's own
 * special case) lives in action.ts's resolveEnemyAction. The flying kinds
 * (bat, kestrel, griffin) take a second action while they are still away
 * from the player after the first, and from HASTED_ENEMY_FLOOR down every
 * monster acts twice per move, a slowed one every other move (enemySpeed.ts).
 * A held enemy (hold monster scroll) does nothing at all. No kind heals itself between hits: original Rogue's
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

	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);

	let progress: EnemyTurnProgress = {
		rng: state.rng,
		playerHp: state.playerHp,
		playerMaxHp: state.playerMaxHp,
		playerStrength: state.playerStrength,
		playerLevel: state.playerLevel,
		playerExperience: state.playerExperience,
		playerConfusedTurnsRemaining: state.confusedTurnsRemaining,
		playerRunFlag: state.playerRunFlag,
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
		if (enemy.held) {
			/* a hold monster scroll's hold: nothing at all until attacked or zapped */
			nextEnemies.push(enemy);
			continue;
		}
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		if (!enemy.awake) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push(enemy);
			continue;
		}

		if (progress.died) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push(enemy);
			continue;
		}
		const result = resolveEnemyTurnActions(state, enemy, progress, occupied);
		const actor = result.actor;
		progress = result.progress;

		if (actor.fled) {
			continue;
		}
		const next = actor.position;
		occupied.add(encodePointKey(next.x, next.y));
		const moved: Enemy = {
			...enemy,
			x: next.x,
			y: next.y,
			hp: actor.hp,
			awake: true,
			speed: result.speed,
			confused: actor.confused,
		};
		/* original Rogue's relocate(): into another room, it picks a new destination */
		if (findRoomAt(state.rooms, enemy) === findRoomAt(state.rooms, next)) {
			nextEnemies.push(moved);
			continue;
		}
		const rng = createRng(1).setState(progress.rng);
		const { goal: _old, ...headingForPlayer } = moved;
		const goal = findItemGoal(
			{ ...state, enemies: nextEnemies },
			headingForPlayer,
			rng,
		);
		progress = { ...progress, rng: rng.getState() };
		nextEnemies.push(
			goal === undefined ? headingForPlayer : { ...headingForPlayer, goal },
		);
	}

	return applyEnemyPickups({
		...state,
		playerHp: Math.max(0, progress.playerHp),
		playerMaxHp: progress.playerMaxHp,
		playerStrength: progress.playerStrength,
		playerLevel: progress.playerLevel,
		playerExperience: progress.playerExperience,
		/* an attack on the player, landed or not, ends the quiet natural healing waits for */
		quietTurns: progress.playerAttacked ? 0 : state.quietTurns,
		confusedTurnsRemaining: progress.playerConfusedTurnsRemaining,
		paralyzedTurnsRemaining: progress.playerParalyzedTurnsRemaining,
		playerRunFlag: progress.playerRunFlag,
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
	});
};
