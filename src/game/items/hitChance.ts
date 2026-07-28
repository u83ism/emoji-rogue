import {
	ENEMY_BASE_HIT_CHANCE_PERCENT,
	ENEMY_HIT_CHANCE_PER_DEFENSE_POINT,
	MAX_HIT_CHANCE_PERCENT,
	MIN_HIT_CHANCE_PERCENT,
	PLAYER_BASE_HIT_CHANCE_PERCENT,
	PLAYER_HIT_CHANCE_PER_ATTACK_BONUS,
} from "../balance.js";
import type { GameState, HeldItem } from "../state.js";
import { calculatePlayerDefense, type SwordItem } from "./equipment.js";

const clampHitChancePercent = (hitChance: number): number =>
	Math.min(MAX_HIT_CHANCE_PERCENT, Math.max(MIN_HIT_CHANCE_PERCENT, hitChance));

/** Percent chance a non-sneak player melee attack connects, boosted by the equipped sword's attackBonus and clamped into [MIN_HIT_CHANCE_PERCENT, MAX_HIT_CHANCE_PERCENT]. */
export const calculatePlayerHitChancePercent = (state: GameState): number => {
	const equippedSword = state.inventory.find(
		(item): item is SwordItem => item.kind === "sword" && item.equipped,
	);
	return clampHitChancePercent(
		PLAYER_BASE_HIT_CHANCE_PERCENT +
			(equippedSword?.attackBonus ?? 0) * PLAYER_HIT_CHANCE_PER_ATTACK_BONUS,
	);
};

/** Percent chance an attacking enemy connects with the player, reduced by the equipped armor's defenseBonus and clamped into [MIN_HIT_CHANCE_PERCENT, MAX_HIT_CHANCE_PERCENT]. */
export const calculateEnemyHitChancePercent = (
	inventory: readonly HeldItem[],
): number =>
	clampHitChancePercent(
		ENEMY_BASE_HIT_CHANCE_PERCENT -
			calculatePlayerDefense(inventory) * ENEMY_HIT_CHANCE_PER_DEFENSE_POINT,
	);
