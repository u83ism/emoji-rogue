import { createRng } from "../../rng.js";
import { buildUnexploredColumns } from "../columns.js";
import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState } from "../state.js";
import { deriveExploredState } from "../vision.js";
import { buildFloorLayout } from "./layout.js";

/**
 * Replaces the current floor with a freshly generated one at `nextFloor`
 * (built with `buildFloorLayout` using `stairsDirection`), carrying over HP,
 * inventory, goldCollected, hasAmulet and the event log; terrain, enemies,
 * items, the staircase, gold piles, traps and the explored grid all start
 * fresh — no floor is ever kept around to revisit. Shared by descendStairs
 * and ascendStairs, which differ only in which direction they move the floor
 * counter and which event they log.
 */
const buildFloorTransition = (
	state: GameState,
	nextFloor: number,
	stairsDirection: "up" | "down",
	event: GameEvent,
): GameState => {
	const rng = createRng(1).setState(state.rng);
	const layout = buildFloorLayout(
		state.width,
		state.height,
		rng,
		nextFloor,
		stairsDirection,
	);
	return deriveExploredState({
		...state,
		terrain: layout.terrain,
		explored: buildUnexploredColumns(state.width, state.height),
		player: layout.player,
		enemies: layout.enemies,
		items: layout.items,
		goldPiles: layout.goldPiles,
		traps: layout.traps,
		stairs: layout.stairs,
		amulet: layout.amulet,
		events: buildEventLog(state.events, [event]),
		rng: rng.getState(),
		floor: nextFloor,
		turnsOnCurrentFloor: 0,
	});
};

/**
 * The next floor down, generated from the state's own RNG so a whole
 * multi-floor run stays reproducible from (dimensions, seed) alone. Pure:
 * deterministic in its argument. GOAL_FLOOR is generated like any other
 * floor (buildFloorLayout forces its staircase to "up" and places the
 * amulet there) — there is no early return here anymore; the run only ends
 * once the player climbs back out, see ascendStairs.
 */
export const descendStairs = (state: GameState): GameState =>
	buildFloorTransition(state, state.floor + 1, "down", {
		type: "floor-descended",
		payload: { floor: state.floor + 1 },
	});

/**
 * The next floor up. The run only ends when ascending from floor 1: the
 * retraced floor 1 is a real floor — regenerated with an "up" staircase like
 * every retrace floor — that must be walked and climbed out of, not a finish
 * line crossed the moment floor 2 is left (2026-07-18 playtest: winning on
 * the 2F→1F transition read as surfacing from a floor that was never
 * entered). Surfacing wins (game-won) with the amulet, otherwise it is the
 * same "exited" status a manual quit produces (no special event; leaving
 * empty-handed is not a loss, just an early end, as in the original).
 */
export const ascendStairs = (state: GameState): GameState => {
	const nextFloor = state.floor - 1;
	if (nextFloor <= 0) {
		if (!state.hasAmulet) {
			return { ...state, floor: 1, turnsOnCurrentFloor: 0, status: "exited" };
		}
		return {
			...state,
			floor: 1,
			turnsOnCurrentFloor: 0,
			events: buildEventLog(state.events, [{ type: "game-won", payload: {} }]),
			status: "won",
		};
	}
	return buildFloorTransition(state, nextFloor, "up", {
		type: "floor-ascended",
		payload: { floor: nextFloor },
	});
};
