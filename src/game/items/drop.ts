import type { ItemKind } from "../events.js";
import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";
import { removeFromInventory } from "./inventory.js";

/**
 * Drops one unit of `kind` from inventory onto the tile under the player.
 * A no-op (same reference) when `kind` is not held. If an item already lies
 * on that exact tile (only reachable by dropping while standing on a kind
 * that couldn't be picked up due to INVENTORY_CAPACITY — see
 * applyItemPickup), the two simply share the tile; picking either back up
 * takes repeated visits, an accepted rare edge case.
 */
export const applyItemDrop = (state: GameState, kind: ItemKind): GameState => {
	if (!state.inventory.includes(kind)) {
		return state;
	}
	return {
		...state,
		inventory: removeFromInventory(state.inventory, kind),
		items: [...state.items, { x: state.player.x, y: state.player.y, kind }],
		events: buildEventLog(state.events, [
			{ type: "item-dropped", payload: { kind } },
		]),
	};
};
