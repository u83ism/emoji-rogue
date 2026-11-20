import { createRng } from "../../rng.js";
import { AMULET_FLOOR } from "../balance.js";
import { buildUnexploredColumns } from "../columns.js";
import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState } from "../state.js";
import { deriveExploredState } from "../vision.js";
import { buildFloorLayout } from "./layout.js";

/**
 * Replaces the current floor with a freshly generated one at `nextFloor`
 * (built with `buildFloorLayout` — with the amulet on it from AMULET_FLOOR
 * down while it is not carried, as original Rogue's put_things()), carrying over HP,
 * inventory, goldCollected, hasAmulet and the event log; terrain, enemies,
 * items, the staircase, gold piles, traps and the explored grid all start
 * fresh — no floor is ever kept around to revisit. Shared by descendStairs
 * and ascendStairs, which differ only in which direction they move the floor
 * counter and which event they log.
 */
const buildFloorTransition = (
	state: GameState,
	nextFloor: number,
	event: GameEvent,
): GameState => {
	const rng = createRng(1).setState(state.rng);
	const deepestFloor = Math.max(state.deepestFloor, nextFloor);
	const layout = buildFloorLayout(
		state.width,
		state.height,
		rng,
		nextFloor,
		!state.hasAmulet && nextFloor >= AMULET_FLOOR,
		state.nextItemId,
		state.floorsWithoutFood,
		/* original Rogue: no gold on the floors climbed back through with the amulet */
		!state.hasAmulet || nextFloor >= deepestFloor,
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
		deepestFloor,
		flytrapHoldDamage: 0,
		turnsOnCurrentFloor: 0,
		nextItemId: layout.nextItemId,
		floorsWithoutFood: layout.floorsWithoutFood,
	});
};

/** Why the player cannot take the stairs `direction` right now — see advanceTurn's applyStairs. */
export type StairsRefusal = "no-stairs" | "levitating" | "magically-blocked";

/**
 * Original Rogue's d_level()/u_level() checks, in their order: levitating
 * blocks both ways, then the player must stand on the staircase, and going
 * up also needs the amulet. Undefined when the stairs can be taken.
 */
export const resolveStairsRefusal = (
	state: GameState,
	direction: "down" | "up",
): StairsRefusal | undefined => {
	if (state.levitationTurnsRemaining > 0) {
		return "levitating";
	}
	if (state.player.x !== state.stairs.x || state.player.y !== state.stairs.y) {
		return "no-stairs";
	}
	if (direction === "up" && !state.hasAmulet) {
		return "magically-blocked";
	}
	return undefined;
};

/**
 * The next floor down, generated from the state's own RNG so a whole
 * multi-floor run stays reproducible from (dimensions, seed) alone. Pure:
 * deterministic in its argument. The dungeon has no bottom (original
 * Rogue's d_level()): there is always one more floor below, amulet or not.
 */
export const descendStairs = (state: GameState): GameState =>
	buildFloorTransition(state, state.floor + 1, {
		type: "floor-descended",
		payload: { floor: state.floor + 1 },
	});

/**
 * The next floor up — only reachable with the amulet (advanceTurn's
 * applyStairs refuses otherwise). The run only ends when ascending from
 * floor 1: the retraced floor 1 is a real floor that must be walked and
 * climbed out of, not a finish
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
	return buildFloorTransition(state, nextFloor, {
		type: "floor-ascended",
		payload: { floor: nextFloor },
	});
};
