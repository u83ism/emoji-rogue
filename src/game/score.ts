import {
	SCORE_AMULET_BONUS,
	SCORE_FOODLESS_BONUS,
	SCORE_PACIFIST_BONUS,
	SCORE_PER_FLOOR,
	SCORE_PER_LEVEL,
} from "./balance.js";
import type { GameState } from "./state.js";

/**
 * The run's final score: gold collected, plus a bonus for depth reached and
 * character level, plus a flat bonus for having obtained the Amulet of
 * Yendor at all (whether or not the run ended in victory), plus conduct
 * bonuses for a pacifist and/or foodless run. Pure — derived entirely from
 * fields GameState already carries.
 */
export const calculateScore = (state: GameState): number =>
	state.goldCollected +
	state.floor * SCORE_PER_FLOOR +
	state.playerLevel * SCORE_PER_LEVEL +
	(state.hasAmulet ? SCORE_AMULET_BONUS : 0) +
	(state.hasAttacked ? 0 : SCORE_PACIFIST_BONUS) +
	(state.hasEaten ? 0 : SCORE_FOODLESS_BONUS);
