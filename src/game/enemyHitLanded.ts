import type { RngState } from "../rng.js";
import { stepUniform } from "../rng.js";
import {
	AQUATOR_RUST_CHANCE_PERCENT,
	ENEMY_ATTACK_DAMAGE,
	ENEMY_MAX_HP,
	MIN_DAMAGE_TAKEN,
	WRAITH_DRAIN_AMOUNT,
} from "./balance.js";
import type { GameEvent } from "./events.js";
import {
	applyArmorRust,
	calculatePlayerDefense,
	canRustEquippedArmor,
} from "./items/equipment.js";
import type { Enemy, HeldItem } from "./state.js";
import { resolveVampireLifesteal } from "./vampireLifesteal.js";
import { resolveWraithDrain } from "./wraithDrain.js";

/** Everything one adjacent bump attack landing changes — see enemies.ts's advanceEnemies. */
export interface EnemyHitLandedResult {
	readonly enemyHp: number;
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly inventory: readonly HeldItem[];
	readonly rng: RngState;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/**
 * Resolves one adjacent bump attack landing: base damage (ENEMY_ATTACK_DAMAGE
 * reduced by calculatePlayerDefense, never below MIN_DAMAGE_TAKEN), then each
 * kind's own extra effect on a landed hit — aquator's armor rust, vampire's
 * lifesteal (vampireLifesteal.ts), wraith's permanent playerMaxHp drain
 * (wraithDrain.ts) — and finally whether this killed the player. Only
 * thief/nymph skip this path entirely, fleeing instead (see enemyFlee.ts).
 */
export const resolveEnemyHitLanded = (
	enemy: Enemy,
	enemyHp: number,
	playerHp: number,
	playerMaxHp: number,
	inventory: readonly HeldItem[],
	rng: RngState,
): EnemyHitLandedResult => {
	const events: GameEvent[] = [];
	const damage = Math.max(
		MIN_DAMAGE_TAKEN,
		ENEMY_ATTACK_DAMAGE[enemy.kind] - calculatePlayerDefense(inventory),
	);
	let nextPlayerHp = playerHp - damage;
	let nextPlayerMaxHp = playerMaxHp;
	let nextInventory = inventory;
	let nextRng = rng;
	let nextEnemyHp = enemyHp;
	events.push({ type: "player-hit", payload: { by: enemy.kind, damage } });

	if (enemy.kind === "aquator" && canRustEquippedArmor(nextInventory)) {
		const rustRoll = stepUniform(nextRng);
		nextRng = rustRoll.state;
		if (rustRoll.value < AQUATOR_RUST_CHANCE_PERCENT / 100) {
			nextInventory = applyArmorRust(nextInventory);
			events.push({ type: "armor-rusted", payload: { amount: 1 } });
		}
	}
	if (enemy.kind === "vampire") {
		const lifesteal = resolveVampireLifesteal(
			nextEnemyHp,
			ENEMY_MAX_HP.vampire,
			damage,
		);
		nextEnemyHp = lifesteal.hp;
		if (lifesteal.event !== undefined) {
			events.push(lifesteal.event);
		}
	}
	if (enemy.kind === "wraith") {
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
