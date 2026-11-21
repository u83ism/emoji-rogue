import { createRng } from "../rng.js";
import {
	SEARCH_BLIND_PENALTY,
	SEARCH_DOOR_FIND_DENOMINATOR,
	SEARCH_HALLUCINATING_PENALTY,
	SEARCH_PASSAGE_FIND_DENOMINATOR,
	SEARCH_TRAP_FIND_DENOMINATOR,
} from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { findWornRings } from "./items/rings.js";
import type { GameState, HiddenTile, Position } from "./state.js";
import { deriveExploredState } from "./vision.js";

/** Whether `tile` is one of the eight around the player. */
const isAround = (state: GameState, tile: Position): boolean =>
	Math.abs(tile.x - state.player.x) <= 1 &&
	Math.abs(tile.y - state.player.y) <= 1 &&
	!(tile.x === state.player.x && tile.y === state.player.y);

/**
 * One search of the eight tiles around the player, as original Rogue's
 * search(): each hidden trap there turns up 1 time in
 * SEARCH_TRAP_FIND_DENOMINATOR — plus SEARCH_HALLUCINATING_PENALTY while
 * hallucinating and SEARCH_BLIND_PENALTY while blind — and is seen from
 * then on (trap-found); each secret door 1 time in
 * SEARCH_DOOR_FIND_DENOMINATOR and each secret passage 1 time in
 * SEARCH_PASSAGE_FIND_DENOMINATOR (the same penalties added), turning back
 * into floor — a door says so (secret-door-found), a passage just appears.
 * Consumes one rng step per hidden thing in reach.
 */
export const applySearch = (state: GameState): GameState => {
	const penalty =
		(state.hallucinatingTurnsRemaining > 0 ? SEARCH_HALLUCINATING_PENALTY : 0) +
		(state.blindTurnsRemaining > 0 ? SEARCH_BLIND_PENALTY : 0);
	const denominator = SEARCH_TRAP_FIND_DENOMINATOR + penalty;
	const rng = createRng(1).setState(state.rng);
	const events: GameEvent[] = [];
	const traps = state.traps.map((trap) => {
		if (!isAround(state, trap) || trap.seen) {
			return trap;
		}
		if (rng.getUniformInt(0, denominator - 1) !== 0) {
			return trap;
		}
		events.push({ type: "trap-found", payload: { kind: trap.kind } });
		return { ...trap, seen: true };
	});
	const found: HiddenTile[] = [];
	for (const tile of state.hiddenTiles) {
		if (!isAround(state, tile)) {
			continue;
		}
		const base =
			tile.kind === "door"
				? SEARCH_DOOR_FIND_DENOMINATOR
				: SEARCH_PASSAGE_FIND_DENOMINATOR;
		if (rng.getUniformInt(0, base + penalty - 1) === 0) {
			found.push(tile);
			if (tile.kind === "door") {
				events.push({ type: "secret-door-found", payload: {} });
			}
		}
	}
	const opened =
		found.length === 0
			? state
			: {
					...state,
					terrain: state.terrain.map((column, x) =>
						column.map((value, y) =>
							found.some((tile) => tile.x === x && tile.y === y) ? 0 : value,
						),
					),
					hiddenTiles: state.hiddenTiles.filter(
						(tile) => !found.includes(tile),
					),
				};
	const searched = {
		...opened,
		traps,
		rng: rng.getState(),
		events: buildEventLog(state.events, events),
	};
	return found.length === 0 ? searched : deriveExploredState(searched);
};

/** Original Rogue's command(): every worn ring of searching searches once a turn, after the daemons. */
export const applySearchingRingTick = (state: GameState): GameState =>
	state.status !== "playing"
		? state
		: findWornRings(state.inventory)
				.filter((ring) => ring.kind === "searching-ring")
				.reduce((current) => applySearch(current), state);
