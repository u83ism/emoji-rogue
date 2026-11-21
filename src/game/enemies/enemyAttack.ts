import type { RngState } from "../../rng.js";
import { rollDamageDice, rollToHit } from "../combat/damage.js";
import { calculateEnemyHitChancePercent } from "../combat/hitChance.js";
import { isStrengthSustained, resolvePoisonDrain } from "../combat/strength.js";
import type { EnemyKind, EnemyName, GameEvent } from "../events.js";
import { resolveArmorRust } from "../items/equipment/equipment.js";
import type { Enemy, HeldItem } from "../state.js";
import {
	resolveVitalityDrain,
	type VitalityDrainerKind,
} from "./abilities/vitalityDrain.js";
import { ENEMY_STATS } from "./enemyStats.js";

/** The player's side of an enemy attack: everything a hit or a kind's on-hit effect can change. */
export interface AttackTarget {
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerStrength: number;
	readonly playerLevel: number;
	readonly playerExperience: number;
	readonly inventory: readonly HeldItem[];
	readonly rng: RngState;
	/** The attacker's deep-floor level bonus (balance.ts's calculateEnemyLevelBonus) — it hits more often. Absent counts as 0. */
	readonly levelBonus?: number;
	/** GameState.playerRunFlag — off, every attack gets NOT_RUNNING_HIT_BONUS. Absent counts as on. */
	readonly playerRunFlag?: boolean;
	/** How the log names the attacker (vision.ts's nameEnemy). Absent, by its kind. */
	readonly attackerName?: EnemyName;
}

/** Everything one enemy's attacks on the player change in a turn — see adjacentAction.ts. */
export interface EnemyAttackResult {
	readonly enemyHp: number;
	readonly target: AttackTarget;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
	/** At least one attack die hit — what a thief or nymph needs before it can steal (adjacentAction.ts). */
	readonly landed: boolean;
}

/** What a kind's on-hit effect sees and returns — see ON_HIT_EFFECTS. */
interface OnHit {
	readonly enemyHp: number;
	readonly target: AttackTarget;
	readonly events: readonly GameEvent[];
	/** The effect itself killed the player (a drain to 0 max HP) — the dice alone show as playerHp <= 0. */
	readonly died: boolean;
}
type OnHitEffect = (enemy: Enemy, hit: OnHit) => OnHit;

const withEvent = (hit: OnHit, event: GameEvent | undefined): OnHit =>
	event === undefined ? hit : { ...hit, events: [...hit.events, event] };

const drainVitality = (kind: VitalityDrainerKind, hit: OnHit): OnHit => {
	const drain = resolveVitalityDrain(kind, hit.target);
	return {
		...hit,
		target: { ...hit.target, ...drain.target },
		events: [...hit.events, ...drain.events],
		died: hit.died || drain.died,
	};
};

/**
 * What a kind does once per turn on top of its damage, when at least one of
 * its attacks landed. A lookup table rather than an if-chain
 * (functional-style.md) — converted at the 4th kind, the scorpion.
 */
const ON_HIT_EFFECTS: Readonly<Partial<Record<EnemyKind, OnHitEffect>>> = {
	/* rusts the worn armor — or logs that its protection blocked the rust */
	aquator: (_enemy, hit) => {
		const rust = resolveArmorRust(hit.target.inventory);
		return withEvent(
			{ ...hit, target: { ...hit.target, inventory: rust.inventory } },
			rust.event,
		);
	},
	/* sometimes takes max HP for good — vitalityDrain.ts */
	vampire: (_enemy, hit) => drainVitality("vampire", hit),
	/* sometimes takes a level and max HP for good — vitalityDrain.ts */
	wraith: (_enemy, hit) => drainVitality("wraith", hit),
	/* original Rogue's rattlesnake: a poisoned sting — strength.ts's resolvePoisonDrain */
	scorpion: (_enemy, hit) => {
		const drain = resolvePoisonDrain(
			hit.target.playerStrength,
			hit.target.playerLevel,
			hit.target.rng,
			isStrengthSustained(hit.target.inventory),
		);
		return withEvent(
			{
				...hit,
				target: {
					...hit.target,
					playerStrength: drain.playerStrength,
					rng: drain.rng,
				},
			},
			drain.strengthLost > 0
				? {
						type: "player-strength-drained",
						payload: { strengthLost: drain.strengthLost },
					}
				: undefined,
		);
	},
};

/**
 * One adjacent enemy's whole attack turn, as in original Rogue's roll_em():
 * every die of ENEMY_STATS[kind].attacks is its own to-hit roll
 * (calculateEnemyHitChancePercent) and, when it lands, its own damage roll
 * — armor only makes the enemy miss, it never reduces damage. The turn logs
 * one event: player-hit with the summed damage if any attack landed, else
 * enemy-attack-missed. The remaining attacks are skipped once the player is
 * dead. If at least one attack landed, the kind's ON_HIT_EFFECTS entry then
 * triggers once. A thief or nymph comes here first and steals only when
 * `landed` (adjacentAction.ts); the venus-flytrap and the ice monster
 * never come here — their turn next to the player is their own.
 */
export const resolveEnemyAttack = (
	enemy: Enemy,
	enemyHp: number,
	target: AttackTarget,
): EnemyAttackResult => {
	const events: GameEvent[] = [];
	const hitChancePercent = calculateEnemyHitChancePercent(
		enemy.kind,
		target.inventory,
		target.levelBonus ?? 0,
		target.playerRunFlag ?? true,
	);
	let rng = target.rng;
	let playerHp = target.playerHp;
	let damageDealt = 0;
	let landed = false;
	for (const attackDice of ENEMY_STATS[enemy.kind].attacks) {
		if (playerHp <= 0) {
			break;
		}
		const hitRoll = rollToHit(rng, hitChancePercent);
		rng = hitRoll.rng;
		if (!hitRoll.hit) {
			continue;
		}
		const diceRoll = rollDamageDice(rng, attackDice, 0, 0);
		rng = diceRoll.rng;
		playerHp -= diceRoll.damage;
		damageDealt += diceRoll.damage;
		landed = true;
	}
	/* One log line per enemy turn, however many dice it has — as original
	 * Rogue's attack() prints one hit/miss message. One line per die pushed
	 * the player's own attack result out of the 3-line log (2026-11-20). */
	events.push(
		landed
			? {
					type: "player-hit",
					payload: {
						by: target.attackerName ?? enemy.kind,
						damage: damageDealt,
					},
				}
			: {
					type: "enemy-attack-missed",
					payload: { by: target.attackerName ?? enemy.kind },
				},
	);

	const afterDice: OnHit = {
		enemyHp,
		target: { ...target, playerHp, rng },
		events,
		died: false,
	};
	/* original Rogue's attack(): a cancelled monster's hit has no special effect */
	const effect = enemy.cancelled ? undefined : ON_HIT_EFFECTS[enemy.kind];
	const afterEffect =
		landed && effect !== undefined ? effect(enemy, afterDice) : afterDice;

	const died = afterEffect.died || afterEffect.target.playerHp <= 0;
	return {
		enemyHp: afterEffect.enemyHp,
		target: afterEffect.target,
		events: died
			? [
					...afterEffect.events,
					{ type: "player-died", payload: { by: enemy.kind } },
				]
			: afterEffect.events,
		died,
		landed,
	};
};
