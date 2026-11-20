import { createRng } from "../../rng.js";
import {
	FAINT_CHANCE_PERCENT,
	FAINT_TURNS_MAX,
	FAINT_TURNS_MIN,
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_WEAK_THRESHOLD,
	REGENERATION_RING_FOOD_COST,
	STARVATION_TURNS,
	STEALTH_RING_FOOD_COST,
	SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT,
} from "../balance.js";
import { buildEventLog, type GameEvent } from "../events.js";
import { hasEquippedRing } from "../items/rings.js";
import type { GameState } from "../state.js";

/**
 * A turn with an empty stomach, as in original Rogue's stomach(): playerFood
 * keeps counting down below zero, and the turn after it has passed
 * -STARVATION_TURNS the player starves to death (player-died, by: "hunger"). Until then every
 * turn the player is not already out cold rolls FAINT_CHANCE_PERCENT (on
 * state.rng) to faint for FAINT_TURNS_MIN..MAX turns — the same
 * paralyzedTurnsRemaining a paralysis potion sets.
 */
const applyStarvationTurn = (state: GameState): GameState => {
	if (state.playerFood < -STARVATION_TURNS) {
		return {
			...state,
			playerHp: 0,
			status: "dead",
			events: buildEventLog(state.events, [
				{ type: "player-died", payload: { by: "hunger" } },
			]),
		};
	}
	const playerFood = state.playerFood - 1;
	if (state.paralyzedTurnsRemaining > 0) {
		return { ...state, playerFood };
	}
	const rng = createRng(1).setState(state.rng);
	if (rng.getUniformInt(0, 99) >= FAINT_CHANCE_PERCENT) {
		return { ...state, playerFood, rng: rng.getState() };
	}
	const turns = rng.getUniformInt(FAINT_TURNS_MIN, FAINT_TURNS_MAX);
	return {
		...state,
		playerFood,
		paralyzedTurnsRemaining: turns,
		/* the hunger stage changed (stomach()): the run flag goes off */
		playerRunFlag: false,
		rng: rng.getState(),
		events: buildEventLog(state.events, [
			{ type: "player-fainted", payload: { turns } },
		]),
	};
};

/**
 * One hunger tick, original Rogue's stomach() daemon: playerFood drops by 1
 * plus whatever the worn ring burns (a ring of regeneration
 * REGENERATION_RING_FOOD_COST more, a ring of stealth
 * STEALTH_RING_FOOD_COST more), with a one-time player-hungry warning the
 * turn it crosses PLAYER_HUNGER_WARNING_THRESHOLD going down and a one-time
 * player-weak warning at PLAYER_WEAK_THRESHOLD (which also weakens the
 * player's damage for as long as playerFood stays at or below it — no
 * separate flag, derived straight from playerFood). With nothing left it
 * becomes applyStarvationTurn instead. A no-op once the run is no longer
 * playing — called after combat/movement resolves each turn-consuming
 * action, so a death from an enemy this same turn must not also take a
 * hunger tick.
 *
 * A ring of sustenance has a SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT chance,
 * rolled on state.rng every turn it is worn, of saving the turn's 1 food.
 * Without that ring an ordinary (not starving) tick never touches
 * state.rng.
 */
export const applyHungerTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	if (state.playerFood <= 0) {
		return applyStarvationTurn(state);
	}

	let rngState = state.rng;
	let cost = 1;
	if (hasEquippedRing(state.inventory, "sustenance-ring")) {
		const rng = createRng(1).setState(state.rng);
		if (rng.getUniformInt(0, 99) < SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT) {
			cost = 0;
		}
		rngState = rng.getState();
	} else if (hasEquippedRing(state.inventory, "regeneration-ring")) {
		cost += REGENERATION_RING_FOOD_COST;
	} else if (hasEquippedRing(state.inventory, "stealth-ring")) {
		cost += STEALTH_RING_FOOD_COST;
	}

	const playerFood = state.playerFood - cost;
	const events: GameEvent[] = [];
	if (
		state.playerFood > PLAYER_HUNGER_WARNING_THRESHOLD &&
		playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD
	) {
		events.push({ type: "player-hungry", payload: {} });
	}
	if (
		state.playerFood > PLAYER_WEAK_THRESHOLD &&
		playerFood <= PLAYER_WEAK_THRESHOLD
	) {
		events.push({ type: "player-weak", payload: {} });
	}
	if (cost === 0 && rngState === state.rng) {
		return state;
	}
	return {
		...state,
		playerFood,
		/* a new hunger stage (stomach()) takes the run flag away */
		playerRunFlag: events.length > 0 ? false : state.playerRunFlag,
		rng: rngState,
		events: buildEventLog(state.events, events),
	};
};
