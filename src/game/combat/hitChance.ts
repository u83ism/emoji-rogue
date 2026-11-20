import {
	DART_TRAP_HIT_BONUS,
	DART_TRAP_LEVEL_BONUS,
	HIT_CHANCE_PERCENT_PER_POINT,
} from "../balance.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import {
	calculatePlayerArmorClass,
	calculatePlayerHitBonus,
} from "../items/equipmentStats.js";
import type { GameState, HeldItem } from "../state.js";
import { calculateStrengthHitBonus } from "./strength.js";

/**
 * Original Rogue's swing() as a percent: a d20 (0-19) plus `hitBonus` must
 * reach 20 - attackerLevel - defenderArmorClass, which lands on exactly
 * (attackerLevel + defenderArmorClass + hitBonus) of the 20 faces. Clamped
 * to 0-100 — unlike the original's die there is no always-hit or
 * always-miss face.
 */
const calculateHitChancePercent = (
	attackerLevel: number,
	defenderArmorClass: number,
	hitBonus: number,
): number =>
	Math.min(
		100,
		Math.max(
			0,
			(attackerLevel + defenderArmorClass + hitBonus) *
				HIT_CHANCE_PERCENT_PER_POINT,
		),
	);

/** Percent chance a player melee attack connects with a `targetKind` enemy: the player's level against that kind's armor class, plus the equipped weapon's hitBonus, the strength's to-hit bonus and `situationalHitBonus` (SLEEPING_TARGET_HIT_BONUS against a sleeping target — combat.ts decides). */
export const calculatePlayerHitChancePercent = (
	state: GameState,
	targetKind: EnemyKind,
	situationalHitBonus = 0,
): number =>
	calculateHitChancePercent(
		state.playerLevel,
		ENEMY_STATS[targetKind].armorClass,
		calculatePlayerHitBonus(state.inventory) +
			calculateStrengthHitBonus(state.playerStrength) +
			situationalHitBonus,
	);

/** Percent chance a thrown weapon connects with a `targetKind` enemy: the player's level against that kind's armor class, plus the strength's to-hit bonus and `hitBonus` (the missile's own, its launcher's, and the sleeping-target bonus — throw.ts adds them up). */
export const calculateThrowHitChancePercent = (
	state: GameState,
	targetKind: EnemyKind,
	hitBonus: number,
): number =>
	calculateHitChancePercent(
		state.playerLevel,
		ENEMY_STATS[targetKind].armorClass,
		hitBonus + calculateStrengthHitBonus(state.playerStrength),
	);

/** Percent chance a dart trap's dart connects with the player — see DART_TRAP_LEVEL_BONUS. */
export const calculateDartTrapHitChancePercent = (
	playerLevel: number,
	inventory: readonly HeldItem[],
): number =>
	calculateHitChancePercent(
		playerLevel + DART_TRAP_LEVEL_BONUS,
		calculatePlayerArmorClass(inventory),
		DART_TRAP_HIT_BONUS,
	);

/** Percent chance one attack of an `attackerKind` enemy connects with the player: that kind's level against the player's armor class. */
export const calculateEnemyHitChancePercent = (
	attackerKind: EnemyKind,
	inventory: readonly HeldItem[],
): number =>
	calculateHitChancePercent(
		ENEMY_STATS[attackerKind].level,
		calculatePlayerArmorClass(inventory),
		0,
	);
