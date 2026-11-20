import { createRng } from "../rng.js";
import {
	SEARCH_BLIND_PENALTY,
	SEARCH_HALLUCINATING_PENALTY,
	SEARCH_TRAP_FIND_DENOMINATOR,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { findWornRings } from "./items/rings.js";
import type { GameState } from "./state.js";

/**
 * One search of the eight tiles around the player, as original Rogue's
 * search(): each hidden trap there turns up 1 time in
 * SEARCH_TRAP_FIND_DENOMINATOR — plus SEARCH_HALLUCINATING_PENALTY while
 * hallucinating and SEARCH_BLIND_PENALTY while blind — and is seen from
 * then on (trap-found). Consumes one rng step per hidden trap in reach.
 * The original's secret doors do not exist in this game.
 */
export const applySearch = (state: GameState): GameState => {
	const denominator =
		SEARCH_TRAP_FIND_DENOMINATOR +
		(state.hallucinatingTurnsRemaining > 0 ? SEARCH_HALLUCINATING_PENALTY : 0) +
		(state.blindTurnsRemaining > 0 ? SEARCH_BLIND_PENALTY : 0);
	const rng = createRng(1).setState(state.rng);
	const events: GameEvent[] = [];
	const traps = state.traps.map((trap) => {
		const near =
			Math.abs(trap.x - state.player.x) <= 1 &&
			Math.abs(trap.y - state.player.y) <= 1 &&
			!(trap.x === state.player.x && trap.y === state.player.y);
		if (!near || trap.seen) {
			return trap;
		}
		if (rng.getUniformInt(0, denominator - 1) !== 0) {
			return trap;
		}
		events.push({ type: "trap-found", payload: { kind: trap.kind } });
		return { ...trap, seen: true };
	});
	return {
		...state,
		traps,
		rng: rng.getState(),
		events: buildEventLog(state.events, events),
	};
};

/** Original Rogue's command(): every worn ring of searching searches once a turn, after the daemons. */
export const applySearchingRingTick = (state: GameState): GameState =>
	state.status !== "playing"
		? state
		: findWornRings(state.inventory)
				.filter((ring) => ring.kind === "searching-ring")
				.reduce((current) => applySearch(current), state);
