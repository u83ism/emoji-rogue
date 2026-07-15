import { advanceTurn } from "./advanceTurn.js";
import { buildDungeonGameState } from "./initialState.js";
import type { Action, GameState } from "./state.js";

/**
 * A fresh run's starting parameters plus every action dispatched during it.
 * Deliberately separate from GameState (which is only ever a snapshot of
 * "now") and from GameState.events (which is capped at 20 entries for save
 * file size) — a replay's whole point is the complete, uncapped history.
 */
export interface Replay {
	readonly width: number;
	readonly height: number;
	readonly seed: number;
	readonly actions: readonly Action[];
}

/**
 * Reconstructs the state a replay ends in: rebuild the initial dungeon from
 * (width, height, seed), then fold advanceTurn over every recorded action in
 * order. Pure and deterministic — the same replay always reproduces the
 * same run, which is the entire payoff of keeping RngState inside GameState
 * (docs/tasks/game.md's design decisions, milestone 1).
 */
export const buildReplayGameState = (replay: Replay): GameState => {
	let state = buildDungeonGameState(replay.width, replay.height, replay.seed);
	for (const action of replay.actions) {
		state = advanceTurn(state, action);
	}
	return state;
};
