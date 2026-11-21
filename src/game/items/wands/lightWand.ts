import { applyRoomEntryWake } from "../../enemies/wakeMonster.js";
import { buildEventLog } from "../../events.js";
import type { Direction, GameState } from "../../state.js";
import { deriveExploredState, findPlayerRoom } from "../../vision.js";

/**
 * A wand of light, as original Rogue's do_zap() (WS_LIGHT): the room the
 * player stands in is lit for good — shown whole from now on, its monsters
 * getting their wake rolls as on entering it (enter_room()). In a corridor
 * it only glows and fades. Asked a direction like every wand, it ignores it.
 */
export const applyUseLightWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState => {
	if (direction === undefined) {
		return state;
	}
	const room = findPlayerRoom(state);
	if (room === undefined) {
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "corridor-glowed", payload: {} },
			]),
		};
	}
	const lit = { ...room, dark: false };
	return applyRoomEntryWake(
		deriveExploredState({
			...state,
			rooms: state.rooms.map((entry) => (entry === room ? lit : entry)),
			events: buildEventLog(state.events, [{ type: "room-lit", payload: {} }]),
		}),
	);
};
