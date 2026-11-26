import { encodePointKey } from "../../pointkey.js";
import { createRng } from "../../rng.js";
import { applyEnemyHit } from "../combat/combat.js";
import { buildEventLog } from "../events.js";
import type { Enemy, GameState } from "../state.js";
import { findRoomAt } from "../vision.js";
import { isHeldByFlytrap } from "./abilities/flytrapHold.js";
import {
	mergeXerocUnmasking,
	removeDisguise,
} from "./abilities/xerocDisguise.js";
import { applyEnemyPickups, findItemGoal } from "./enemyPack.js";
import type { EnemyTurnProgress, FlameStrike } from "./turn/action.js";
import { resolveEnemyTurnActions } from "./turn/enemySpeed.js";

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
		flameStrikes: [],
	};
	const nextEnemies: Enemy[] = [];
	/* which enemy of the turn's start each entry of nextEnemies came from */
	const sources: Enemy[] = [];
	const keep = (source: Enemy, next: Enemy): void => {
		nextEnemies.push(next);
		sources.push(source);
	};
	for (const enemy of state.enemies) {
		if (enemy.held) {
			/* a hold monster scroll's hold: nothing at all until attacked or zapped */
			keep(enemy, enemy);
			continue;
		}
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		if (!enemy.awake) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			keep(enemy, enemy);
			continue;
		}

		if (progress.died) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			keep(enemy, enemy);
			continue;
		}
		const result = resolveEnemyTurnActions(
			state,
			enemy,
			{ ...progress, playerAttacked: false },
			occupied,
		);
		const actor = result.actor;
		const unmasked = mergeXerocUnmasking(
			state,
			enemy,
			progress,
			result.progress,
		);
		progress = unmasked.progress;

		if (actor.fled) {
			continue;
		}
		const next = actor.position;
		occupied.add(encodePointKey(next.x, next.y));
		const moved: Enemy = {
			...(unmasked.unmasked ? removeDisguise(enemy) : enemy),
			x: next.x,
			y: next.y,
			hp: actor.hp,
			awake: true,
			speed: result.speed,
			confused: actor.confused,
		};
		/* original Rogue's relocate(): into another room, it picks a new destination */
		if (findRoomAt(state.rooms, enemy) === findRoomAt(state.rooms, next)) {
			keep(enemy, moved);
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
		keep(
			enemy,
			goal === undefined ? headingForPlayer : { ...headingForPlayer, goal },
		);
	}

	return applyEnemyPickups(
		applyFlameStrikes(
			{
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
				frozen: progress.events.some((event) => event.type === "player-frozen")
					? true
					: state.frozen,
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
			},
			progress.flameStrikes,
			sources,
		),
	);
};

/**
 * The monsters a dragon's flame struck this turn take their 6d6 as a hit
 * of the player's (original Rogue's hit_monster() — experience, drops, the
 * glowing hands and all; combat.ts's applyEnemyHit). `sources` lines up
 * with the enemies after the loop; a struck one that fled is spared.
 */
const applyFlameStrikes = (
	state: GameState,
	strikes: readonly FlameStrike[],
	sources: readonly Enemy[],
): GameState => {
	let current = state;
	const slots = [...sources];
	for (const strike of strikes) {
		const index = slots.indexOf(strike.target);
		const target = current.enemies[index];
		if (index < 0 || target === undefined || current.status !== "playing") {
			continue;
		}
		const before = current.enemies.length;
		current = applyEnemyHit(current, target, strike.damage, {
			type: "enemy-flamed",
			payload: { target: strike.name, damage: strike.damage },
		});
		if (current.enemies.length < before) {
			slots.splice(index, 1);
		}
	}
	return current;
};
