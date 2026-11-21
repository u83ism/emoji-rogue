import {
	ARROW_TRAP_HIT_BONUS,
	ARROW_TRAP_LEVEL_BONUS,
	calculateEnemyLevelBonus,
	DART_TRAP_HIT_BONUS,
	DART_TRAP_LEVEL_BONUS,
	HIT_CHANCE_PERCENT_PER_POINT,
	NOT_RUNNING_HIT_BONUS,
} from "../balance.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import {
	calculatePlayerArmorClass,
	calculatePlayerHitBonus,
} from "../items/equipment/equipmentStats.js";
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

/** Percent chance a player melee attack connects with a `targetKind` enemy: the player's level against that kind's armor class (better on deep floors), plus the equipped weapon's hitBonus and the strength's to-hit bonus. */
export const calculatePlayerHitChancePercent = (
	state: GameState,
	targetKind: EnemyKind,
): number =>
	calculateHitChancePercent(
		state.playerLevel,
		ENEMY_STATS[targetKind].armorClass - calculateEnemyLevelBonus(state.floor),
		calculatePlayerHitBonus(state.inventory) +
			calculateStrengthHitBonus(state.playerStrength),
	);

/** Percent chance a thrown weapon connects with a `targetKind` enemy: the player's level against that kind's armor class, plus the strength's to-hit bonus and `hitBonus` (the missile's own and its launcher's — throw.ts adds them up). */
export const calculateThrowHitChancePercent = (
	state: GameState,
	targetKind: EnemyKind,
	hitBonus: number,
): number =>
	calculateHitChancePercent(
		state.playerLevel,
		ENEMY_STATS[targetKind].armorClass - calculateEnemyLevelBonus(state.floor),
		hitBonus + calculateStrengthHitBonus(state.playerStrength),
	);

/** Percent chance an arrow trap's arrow connects with the player — see ARROW_TRAP_LEVEL_BONUS. */
export const calculateArrowTrapHitChancePercent = (
	playerLevel: number,
	inventory: readonly HeldItem[],
): number =>
	calculateHitChancePercent(
		playerLevel + ARROW_TRAP_LEVEL_BONUS,
		calculatePlayerArmorClass(inventory),
		ARROW_TRAP_HIT_BONUS,
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

/**
 * Percent chance one attack of an `attackerKind` enemy connects with the
 * player: that kind's level (plus `levelBonus` on deep floors —
 * calculateEnemyLevelBonus) against the player's armor class, plus
 * NOT_RUNNING_HIT_BONUS while the player's run flag is off
 * (GameState.playerRunFlag).
 */
export const calculateEnemyHitChancePercent = (
	attackerKind: EnemyKind,
	inventory: readonly HeldItem[],
	levelBonus = 0,
	playerRunFlag = true,
): number =>
	calculateHitChancePercent(
		ENEMY_STATS[attackerKind].level + levelBonus,
		calculatePlayerArmorClass(inventory),
		playerRunFlag ? 0 : NOT_RUNNING_HIT_BONUS,
	);
