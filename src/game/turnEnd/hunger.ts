import { createRng } from "../../rng.js";
import {
	HUNGER_TURNS_PER_POINT,
	PLAYER_HUNGER_WARNING_THRESHOLD,
	STARVATION_DAMAGE_PER_TURN,
	SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT,
} from "../balance.js";
import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Applies STARVATION_DAMAGE_PER_TURN and logs it, ending the run
 * (player-died, by: "hunger") if it brings HP to zero. Called every turn
 * spent at 0 food regardless of hungerTickCounter — once actually starving,
 * HUNGER_TURNS_PER_POINT no longer applies (there is no slower way to be at
 * zero food).
 */
const applyStarvationDamage = (state: GameState): GameState => {
	const playerHp = state.playerHp - STARVATION_DAMAGE_PER_TURN;
	const events: GameEvent[] = [
		{ type: "player-starved", payload: { damage: STARVATION_DAMAGE_PER_TURN } },
	];
	if (playerHp <= 0) {
		events.push({ type: "player-died", payload: { by: "hunger" } });
	}
	return {
		...state,
		playerHp: Math.max(0, playerHp),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
};

/**
 * The deterministic part of a hunger tick — never touches state.rng. While
 * playerFood is still positive, only hungerTickCounter advances most turns;
 * a food point is actually lost (and hungerTickCounter resets to 0) only once
 * it reaches HUNGER_TURNS_PER_POINT, with a one-time player-hungry warning
 * the turn that loss crosses the warning threshold going down. Losing the
 * last point and starving both happen on the same turn (no grace turn at
 * exactly 0) — matching the original always-1-point-per-turn pace exactly
 * when HUNGER_TURNS_PER_POINT is 1. Once playerFood is already 0 going in,
 * every turn is a starvation turn instead — hungerTickCounter stops
 * mattering (see applyStarvationDamage).
 */
const applyHungerConsequences = (state: GameState): GameState => {
	if (state.playerFood <= 0) {
		return applyStarvationDamage(state);
	}

	const hungerTickCounter = state.hungerTickCounter + 1;
	if (hungerTickCounter < HUNGER_TURNS_PER_POINT) {
		return { ...state, hungerTickCounter };
	}

	const playerFood = state.playerFood - 1;
	const events: GameEvent[] = [];
	if (
		state.playerFood > PLAYER_HUNGER_WARNING_THRESHOLD &&
		playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD
	) {
		events.push({ type: "player-hungry", payload: {} });
	}
	const afterLoss: GameState = {
		...state,
		playerFood,
		hungerTickCounter: 0,
		events: buildEventLog(state.events, events),
	};
	return playerFood > 0 ? afterLoss : applyStarvationDamage(afterLoss);
};

/**
 * Ticks the hunger clock forward one turn and applies its consequences (see
 * applyHungerConsequences and applyStarvationDamage). A no-op once the run
 * is no longer playing — called after combat/movement resolves each
 * turn-consuming action, so a death from an enemy this same turn must not
 * also take a hunger tick.
 *
 * While hasRingOfSustenance is set, the whole tick has a
 * SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT chance of being skipped outright
 * (rolled via the same temporary-stateful-Rng pattern as
 * applyRegenerationTick, consuming state.rng either way) — including the
 * hungerTickCounter advance, so the ring slows the clock down twice over.
 * Without the ring this function never touches state.rng, staying fully
 * deterministic.
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
