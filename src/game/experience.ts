import {
	LEVEL_EXPERIENCE_THRESHOLDS,
	PLAYER_LEVEL_UP_HP_DICE_SIDES,
} from "./balance.js";
import { rollDamageDice } from "./damage.js";
import { buildEventLog, type GameEvent } from "./events.js";
import type { GameState } from "./state.js";

/**
 * The player moved up `levelsGained` levels: playerMaxHp and playerHp both
 * grow by one PLAYER_LEVEL_UP_HP_DICE_SIDES-sided die per level (original
 * Rogue's check_level), consuming state.rng once per level, and each new
 * level records a player-leveled-up event.
 */
const applyLevelsGained = (
	state: GameState,
	levelsGained: number,
): GameState => {
	const hpRoll = rollDamageDice(
		state.rng,
		{ count: levelsGained, sides: PLAYER_LEVEL_UP_HP_DICE_SIDES },
		0,
		0,
	);
	const events: GameEvent[] = Array.from(
		{ length: levelsGained },
		(_, index) => ({
			type: "player-leveled-up",
			payload: { level: state.playerLevel + index + 1 },
		}),
	);
	return {
		...state,
		playerLevel: state.playerLevel + levelsGained,
		playerMaxHp: state.playerMaxHp + hpRoll.damage,
		playerHp: state.playerHp + hpRoll.damage,
		rng: hpRoll.rng,
		events: buildEventLog(state.events, events),
	};
};

/**
 * Adds `amount` experience and applies every level-up it crosses (a single
 * large gain can cross more than one threshold at once) — see
 * applyLevelsGained. A gain that crosses no threshold consumes no rng.
 */
export const applyExperienceGain = (
	state: GameState,
	amount: number,
): GameState => {
	const playerExperience = state.playerExperience + amount;
	let playerLevel = state.playerLevel;
	while (
		playerLevel - 1 < LEVEL_EXPERIENCE_THRESHOLDS.length &&
		playerExperience >= (LEVEL_EXPERIENCE_THRESHOLDS[playerLevel - 1] ?? 0)
	) {
		playerLevel += 1;
	}
	const gained = { ...state, playerExperience };
	return playerLevel === state.playerLevel
		? gained
		: applyLevelsGained(gained, playerLevel - state.playerLevel);
};

/**
 * An unconditional +1 level, bypassing LEVEL_EXPERIENCE_THRESHOLDS entirely —
 * playerExperience is untouched, and (unlike applyExperienceGain) there is no
 * level cap here, since this is what a potion of raise level is for: growth
 * past what normal kill-based leveling can reach.
 */
export const applyLevelUp = (state: GameState): GameState =>
	applyLevelsGained(state, 1);
