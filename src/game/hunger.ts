import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	STARVATION_DAMAGE_PER_TURN,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import type { GameState } from "./state.js";

/**
 * Ticks playerFood down by one and applies its consequences: a one-time
 * player-hungry warning the turn food crosses the warning threshold going
 * down, and STARVATION_DAMAGE_PER_TURN of HP loss (with a player-starved
 * event) every turn spent at 0 food, which can itself end the run
 * (player-died, by: "hunger"). A no-op once the run is no longer playing —
 * called after combat/movement resolves each turn-consuming action, so a
 * death from an enemy this same turn must not also take a hunger tick.
 */
export const applyHungerTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}

	const playerFood = Math.max(0, state.playerFood - 1);
	const events: GameEvent[] = [];
	if (
		state.playerFood > PLAYER_HUNGER_WARNING_THRESHOLD &&
		playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD
	) {
		events.push({ type: "player-hungry", payload: {} });
	}

	if (playerFood > 0) {
		return {
			...state,
			playerFood,
			events: buildEventLog(state.events, events),
		};
	}

	const playerHp = state.playerHp - STARVATION_DAMAGE_PER_TURN;
	events.push({
		type: "player-starved",
		payload: { damage: STARVATION_DAMAGE_PER_TURN },
	});
	if (playerHp <= 0) {
		events.push({ type: "player-died", payload: { by: "hunger" } });
	}

	return {
		...state,
		playerFood,
		playerHp: Math.max(0, playerHp),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
};
