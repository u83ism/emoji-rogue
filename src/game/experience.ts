import {
	LEVEL_EXPERIENCE_THRESHOLDS,
	PLAYER_LEVEL_UP_HP_BONUS,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import type { GameState } from "./state.js";

/**
 * Adds `amount` experience and applies every level-up it crosses (a single
 * large gain can cross more than one threshold at once). Each level gained
 * raises playerMaxHp and playerHp by PLAYER_LEVEL_UP_HP_BONUS and records a
 * player-leveled-up event. Deterministic — no rng involved.
 */
export const applyExperienceGain = (
	state: GameState,
	amount: number,
): GameState => {
	const playerExperience = state.playerExperience + amount;
	const events: GameEvent[] = [];
	let playerLevel = state.playerLevel;
	let playerMaxHp = state.playerMaxHp;
	let playerHp = state.playerHp;
	while (
		playerLevel - 1 < LEVEL_EXPERIENCE_THRESHOLDS.length &&
		playerExperience >= (LEVEL_EXPERIENCE_THRESHOLDS[playerLevel - 1] ?? 0)
	) {
		playerLevel += 1;
		playerMaxHp += PLAYER_LEVEL_UP_HP_BONUS;
		playerHp += PLAYER_LEVEL_UP_HP_BONUS;
		events.push({ type: "player-leveled-up", payload: { level: playerLevel } });
	}
	return {
		...state,
		playerExperience,
		playerLevel,
		playerMaxHp,
		playerHp,
		events: buildEventLog(state.events, events),
	};
};
