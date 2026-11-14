import { HIT_CHANCE_PERCENT_PER_POINT } from "../balance.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import {
	calculatePlayerArmorClass,
	type WeaponItem,
} from "./equipmentStats.js";

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

/** Percent chance a non-sneak player melee attack connects with a `targetKind` enemy: the player's level against that kind's armor class, plus the equipped weapon's attackBonus. */
export const calculatePlayerHitChancePercent = (
	state: GameState,
	targetKind: EnemyKind,
): number => {
	const equippedWeapon = state.inventory.find(
		(item): item is WeaponItem => item.kind === "weapon" && item.equipped,
	);
	return calculateHitChancePercent(
		state.playerLevel,
		ENEMY_STATS[targetKind].armorClass,
		equippedWeapon?.attackBonus ?? 0,
	);
};

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
