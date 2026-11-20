import type { RngState } from "../../rng.js";
import { WRAITH_DRAIN_AMOUNT } from "../balance.js";
import { rollDamageDice, rollToHit } from "../damage.js";
import type { EnemyKind, GameEvent } from "../events.js";
import { resolveArmorRust } from "../items/equipment.js";
import { calculateEnemyHitChancePercent } from "../items/hitChance.js";
import type { Enemy, HeldItem } from "../state.js";
import { resolvePoisonDrain } from "../strength.js";
import { ENEMY_STATS } from "./enemyStats.js";
import { resolveVampireLifesteal } from "./vampireLifesteal.js";
import { resolveWraithDrain } from "./wraithDrain.js";

/** The player's side of an enemy attack: everything a hit or a kind's on-hit effect can change. */
export interface AttackTarget {
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerStrength: number;
	readonly playerLevel: number;
	readonly inventory: readonly HeldItem[];
	readonly rng: RngState;
}

/** Everything one enemy's attacks on the player change in a turn — see adjacentAction.ts. */
export interface EnemyAttackResult {
	readonly enemyHp: number;
	readonly target: AttackTarget;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/** What a kind's on-hit effect sees and returns — see ON_HIT_EFFECTS. */
interface OnHit {
	readonly enemyHp: number;
	readonly target: AttackTarget;
	readonly events: readonly GameEvent[];
}
type OnHitEffect = (enemy: Enemy, damageDealt: number, hit: OnHit) => OnHit;

const withEvent = (hit: OnHit, event: GameEvent | undefined): OnHit =>
	event === undefined ? hit : { ...hit, events: [...hit.events, event] };

/**
 * What a kind does once per turn on top of its damage, when at least one of
 * its attacks landed. A lookup table rather than an if-chain
 * (functional-style.md) — converted at the 4th kind, the scorpion.
 */
const ON_HIT_EFFECTS: Readonly<Partial<Record<EnemyKind, OnHitEffect>>> = {
	/* rusts the worn armor — or logs that its protection blocked the rust */
	aquator: (_enemy, _damage, hit) => {
		const rust = resolveArmorRust(hit.target.inventory);
		return withEvent(
			{ ...hit, target: { ...hit.target, inventory: rust.inventory } },
			rust.event,
		);
	},
	/* heals itself for part of the damage — vampireLifesteal.ts */
	vampire: (enemy, damageDealt, hit) => {
		const lifesteal = resolveVampireLifesteal(
			hit.enemyHp,
			enemy.maxHp,
			damageDealt,
		);
		return withEvent({ ...hit, enemyHp: lifesteal.hp }, lifesteal.event);
	},
	/* lowers the player's max HP for good — wraithDrain.ts */
	wraith: (_enemy, _damage, hit) => {
		const drain = resolveWraithDrain(
			hit.target.playerMaxHp,
			hit.target.playerHp,
			WRAITH_DRAIN_AMOUNT,
		);
		return withEvent(
			{
				...hit,
				target: {
					...hit.target,
					playerMaxHp: drain.playerMaxHp,
					playerHp: drain.playerHp,
				},
			},
			drain.event,
		);
	},
	/* original Rogue's rattlesnake: a poisoned sting — strength.ts's resolvePoisonDrain */
	scorpion: (_enemy, _damage, hit) => {
		const drain = resolvePoisonDrain(
			hit.target.playerStrength,
			hit.target.playerLevel,
			hit.target.rng,
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
 * triggers once. Thief/nymph, the venus-flytrap and the ice monster never
 * come here — their turn next to the player is their own (adjacentAction.ts).
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
					payload: { by: enemy.kind, damage: damageDealt },
				}
			: { type: "enemy-attack-missed", payload: { by: enemy.kind } },
	);

	const afterDice: OnHit = {
		enemyHp,
		target: { ...target, playerHp, rng },
		events,
	};
	const effect = ON_HIT_EFFECTS[enemy.kind];
	const afterEffect =
		landed && effect !== undefined
			? effect(enemy, damageDealt, afterDice)
			: afterDice;

	const died = afterEffect.target.playerHp <= 0;
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
	};
};
