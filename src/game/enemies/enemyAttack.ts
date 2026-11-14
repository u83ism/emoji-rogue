import type { RngState } from "../../rng.js";
import { WRAITH_DRAIN_AMOUNT } from "../balance.js";
import { rollDamageDice, rollToHit } from "../damage.js";
import type { GameEvent } from "../events.js";
import { applyArmorRust, canRustEquippedArmor } from "../items/equipment.js";
import { calculateEnemyHitChancePercent } from "../items/hitChance.js";
import type { Enemy, HeldItem } from "../state.js";
import { ENEMY_STATS } from "./enemyStats.js";
import { resolveVampireLifesteal } from "./vampireLifesteal.js";
import { resolveWraithDrain } from "./wraithDrain.js";

/** Everything one enemy's attacks on the player change in a turn — see enemies.ts's advanceEnemies. */
export interface EnemyAttackResult {
	readonly enemyHp: number;
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly inventory: readonly HeldItem[];
	readonly rng: RngState;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/**
 * One adjacent enemy's whole attack turn, as in original Rogue's roll_em():
 * every die of ENEMY_STATS[kind].attacks is its own to-hit roll
 * (calculateEnemyHitChancePercent) and, when it lands, its own damage roll
 * — armor only makes the enemy miss, it never reduces damage. A miss logs
 * enemy-attack-missed; the remaining attacks are skipped once the player is
 * dead. If at least one attack landed, the kind's own effect then triggers
 * once: aquator's armor rust, vampire's lifesteal on the turn's total
 * damage (vampireLifesteal.ts), wraith's permanent playerMaxHp drain
 * (wraithDrain.ts). Only thief/nymph skip this path entirely, fleeing
 * instead (see enemyFlee.ts).
 */
export const resolveEnemyAttack = (
	enemy: Enemy,
	enemyHp: number,
	playerHp: number,
	playerMaxHp: number,
	inventory: readonly HeldItem[],
	rng: RngState,
): EnemyAttackResult => {
	const events: GameEvent[] = [];
	const hitChancePercent = calculateEnemyHitChancePercent(
		enemy.kind,
		inventory,
	);
	let nextRng = rng;
	let nextPlayerHp = playerHp;
	let damageDealt = 0;
	let landed = false;
	for (const attackDice of ENEMY_STATS[enemy.kind].attacks) {
		if (nextPlayerHp <= 0) {
			break;
		}
		const hitRoll = rollToHit(nextRng, hitChancePercent);
		nextRng = hitRoll.rng;
		if (!hitRoll.hit) {
			events.push({ type: "enemy-attack-missed", payload: { by: enemy.kind } });
			continue;
		}
		const diceRoll = rollDamageDice(nextRng, attackDice, 0, 0);
		nextRng = diceRoll.rng;
		nextPlayerHp -= diceRoll.damage;
		damageDealt += diceRoll.damage;
		landed = true;
		events.push({
			type: "player-hit",
			payload: { by: enemy.kind, damage: diceRoll.damage },
		});
	}

	let nextPlayerMaxHp = playerMaxHp;
	let nextInventory = inventory;
	let nextEnemyHp = enemyHp;
	if (landed && enemy.kind === "aquator" && canRustEquippedArmor(inventory)) {
		nextInventory = applyArmorRust(inventory);
		events.push({ type: "armor-rusted", payload: { amount: 1 } });
	}
	if (landed && enemy.kind === "vampire") {
		const lifesteal = resolveVampireLifesteal(
			enemyHp,
			enemy.maxHp,
			damageDealt,
		);
		nextEnemyHp = lifesteal.hp;
		if (lifesteal.event !== undefined) {
			events.push(lifesteal.event);
		}
	}
	if (landed && enemy.kind === "wraith") {
		const drain = resolveWraithDrain(
			nextPlayerMaxHp,
			nextPlayerHp,
			WRAITH_DRAIN_AMOUNT,
		);
		nextPlayerMaxHp = drain.playerMaxHp;
		nextPlayerHp = drain.playerHp;
		if (drain.event !== undefined) {
			events.push(drain.event);
		}
	}

	const died = nextPlayerHp <= 0;
	if (died) {
		events.push({ type: "player-died", payload: { by: enemy.kind } });
	}
	return {
		enemyHp: nextEnemyHp,
		playerHp: nextPlayerHp,
		playerMaxHp: nextPlayerMaxHp,
		inventory: nextInventory,
		rng: nextRng,
		events,
		died,
	};
};
