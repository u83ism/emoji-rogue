import type { RngState } from "../../rng.js";
import { createRng } from "../../rng.js";
import {
	calculateEnemyLevelBonus,
	calculatePlayerMagicSaveChancePercent,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
} from "../balance.js";
import { applyCarriedItemsDrop } from "../enemies/enemyPack.js";
import { calculateEnemyExperienceReward } from "../enemies/enemyStats.js";
import { buildEventLog, type GameEvent } from "../events.js";
import { drawGoldAmount } from "../floor/rooms.js";
import {
	calculatePlayerDamageBonus,
	calculatePlayerDamageDice,
	calculateRingMeleeDamageBonus,
	sumRingBonus,
} from "../items/equipmentStats.js";
import type { Enemy, GameState, Position } from "../state.js";
import { type DamageRoll, rollDamageDice, rollToHit } from "./damage.js";
import { applyExperienceGain } from "./experience.js";
import { calculatePlayerHitChancePercent } from "./hitChance.js";

/**
 * The gold an orc or thief leaves behind, dropped straight into
 * goldCollected the instant it dies — no GoldPile entity involved, unlike
 * gold found on the floor. An orc drops one gold pile's worth; a thief
 * (original Rogue's leprechaun) drops one too, or
 * THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME of them when the player passes a magic
 * save — but only on the deepest floor reached so far, never while
 * climbing back up (the original's guard against farming them on the way
 * out). Consumes state.rng via the same "temporarily wake a stateful Rng"
 * pattern as teleport.ts's applyRandomTeleport.
 */
const applyThiefGoldDrop = (state: GameState): GameState => {
	if (state.floor < state.deepestFloor) {
		return state;
	}
	const rng = createRng(1).setState(state.rng);
	const savedAgainstMagic =
		rng.getUniformInt(0, 99) <
		calculatePlayerMagicSaveChancePercent(
			state.playerLevel,
			sumRingBonus(state.inventory, "protection-ring"),
		);
	const pileCount = savedAgainstMagic ? THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME : 1;
	let amount = 0;
	for (let i = 0; i < pileCount; i++) {
		amount += drawGoldAmount(rng, state.floor);
	}
	return {
		...state,
		goldCollected: state.goldCollected + amount,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "enemy-gold-drop", payload: { by: "thief", amount } },
		]),
	};
};

/** Whether the two touch, diagonals included (geometry only — directions.ts's isWithinReach also rules out cutting a corner). */
export const isAdjacent = (left: Position, right: Position): boolean =>
	Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)) === 1;

/**
 * The shared back half of every player-sourced hit: `damage` applied to
 * `target`, `hitEvent` logged, a kill removing the enemy (with enemy-defeated
 * and experience) or a survivor waking up, and the quiet turns natural
 * healing waits on reset either way. With the player's hands glowing
 * (nextHitConfuses, original Rogue's CANHUH) the glow passes into the
 * target, confusing it if it lives — said only while the player can see. Only how the damage and the event are produced differs between
 * melee, wand (the callers below) and a thrown weapon (items/throw.ts).
 */
export const applyEnemyHit = (
	state: GameState,
	target: Enemy,
	damage: number,
	hitEvent: GameEvent,
): GameState => {
	const remainingHp = target.hp - damage;
	const confuses = state.nextHitConfuses;
	const events: GameEvent[] = [hitEvent];
	if (confuses) {
		events.push({ type: "hands-stopped-glowing", payload: {} });
	}
	if (remainingHp <= 0) {
		events.push({ type: "enemy-defeated", payload: { target: target.kind } });
	} else if (confuses && state.blindTurnsRemaining === 0) {
		events.push({ type: "enemy-confused", payload: { target: target.kind } });
	}

	const enemies =
		remainingHp <= 0
			? state.enemies.filter((enemy) => enemy !== target)
			: state.enemies.map((enemy) =>
					enemy === target
						? {
								...enemy,
								hp: remainingHp,
								awake: true,
								held: false,
								confused: enemy.confused || confuses,
							}
						: enemy,
				);
	const next: GameState = {
		...state,
		nextHitConfuses: false,
		enemies,
		quietTurns: 0,
		events: buildEventLog(state.events, events),
	};
	if (remainingHp > 0) {
		return next;
	}
	const withExperience = applyExperienceGain(
		next,
		calculateEnemyExperienceReward(
			target.kind,
			target.maxHp,
			calculateEnemyLevelBonus(state.floor),
		),
	);
	const dropped = applyCarriedItemsDrop(withExperience, target);
	return target.kind === "thief" ? applyThiefGoldDrop(dropped) : dropped;
};

/**
 * Rolls the player's damage as original Rogue does: the weapon's dice (bare
 * hands otherwise) plus calculatePlayerDamageBonus (the strength bonus and
 * the equipped weapon's own damageBonus) and worn increase damage rings
 * (with a weapon only), never below 0.
 */
const rollPlayerDamage = (rng: RngState, state: GameState): DamageRoll =>
	rollDamageDice(
		rng,
		calculatePlayerDamageDice(state.inventory),
		calculatePlayerDamageBonus(state) +
			calculateRingMeleeDamageBonus(state.inventory),
		0,
	);

/**
 * The player's bump attack resolved against one enemy: it first rolls
 * calculatePlayerHitChancePercent — no edge against a sleeping target, since
 * original Rogue's fight() wakes it before rolling — and a
 * miss ends the turn with no damage (player-attack-missed) but still resets
 * quietTurns (swinging, even missing, is fighting). The
 * player does not move — attacking is what the movement turn was spent on.
 */
export const applyPlayerAttack = (
	state: GameState,
	target: Enemy,
): GameState => {
	const hitRoll = rollToHit(
		state.rng,
		calculatePlayerHitChancePercent(state, target.kind),
	);
	if (!hitRoll.hit) {
		return {
			...state,
			/* original Rogue's fight() wakes the target (runto()) before it even rolls */
			enemies: state.enemies.map((enemy) =>
				enemy === target ? { ...enemy, awake: true, held: false } : enemy,
			),
			rng: hitRoll.rng,
			quietTurns: 0,
			events: buildEventLog(state.events, [
				{ type: "player-attack-missed", payload: { target: target.kind } },
			]),
		};
	}
	const diceRoll = rollPlayerDamage(hitRoll.rng, state);
	return applyEnemyHit(
		{ ...state, rng: diceRoll.rng },
		target,
		diceRoll.damage,
		{
			type: "enemy-hit",
			payload: { target: target.kind, damage: diceRoll.damage },
		},
	);
};
