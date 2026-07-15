import { createRng } from "../rng.js";
import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	STARVATION_DAMAGE_PER_TURN,
	SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import type { GameState } from "./state.js";

/** The deterministic part of a hunger tick — never touches state.rng. */
const applyHungerConsequences = (state: GameState): GameState => {
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

/**
 * Ticks playerFood down by one and applies its consequences: a one-time
 * player-hungry warning the turn food crosses the warning threshold going
 * down, and STARVATION_DAMAGE_PER_TURN of HP loss (with a player-starved
 * event) every turn spent at 0 food, which can itself end the run
 * (player-died, by: "hunger"). A no-op once the run is no longer playing —
 * called after combat/movement resolves each turn-consuming action, so a
 * death from an enemy this same turn must not also take a hunger tick.
 *
 * While hasRingOfSustenance is set, the whole tick has a
 * SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT chance of being skipped outright
 * (rolled via the same temporary-stateful-Rng pattern as
 * applyRegenerationTick, consuming state.rng either way). Without the ring
 * this function never touches state.rng, staying fully deterministic.
 */
export const applyHungerTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}

	if (!state.hasRingOfSustenance) {
		return applyHungerConsequences(state);
	}

	const rng = createRng(1).setState(state.rng);
	const skipped =
		rng.getUniformInt(0, 99) < SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT;
	if (skipped) {
		return { ...state, rng: rng.getState() };
	}
	return applyHungerConsequences({ ...state, rng: rng.getState() });
};
