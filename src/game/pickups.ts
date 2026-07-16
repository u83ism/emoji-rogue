import { buildEventLog } from "./events.js";
import { addToInventory } from "./inventory.js";
import type { GameState } from "./state.js";

/**
 * Picks up the item under the player's feet into inventory, if any — no
 * longer used immediately (that's the "use-item" action's job).
 */
export const applyItemPickup = (state: GameState): GameState => {
	const item = state.items.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (item === undefined) {
		return state;
	}
	return {
		...state,
		inventory: addToInventory(state.inventory, item.kind),
		items: state.items.filter((candidate) => candidate !== item),
		events: buildEventLog(state.events, [
			{ type: "item-picked-up", payload: { kind: item.kind } },
		]),
	};
};

/**
 * Picks up the Amulet of Yendor if it is lying under the player's feet
 * (only possible on GOAL_FLOOR, before it has been taken). Unconditional and
 * immediate, like gold — there is no "use" step, and hasAmulet never turns
 * back off once set.
 */
export const applyAmuletPickup = (state: GameState): GameState => {
	if (
		state.amulet === undefined ||
		state.amulet.x !== state.player.x ||
		state.amulet.y !== state.player.y
	) {
		return state;
	}
	return {
		...state,
		amulet: undefined,
		hasAmulet: true,
		events: buildEventLog(state.events, [
			{ type: "amulet-obtained", payload: {} },
		]),
	};
};

/**
 * Adds any gold pile under the player's feet straight to goldCollected — no
 * inventory slot, no use-item step, unlike Item. Picking up gold is
 * unconditional and immediate.
 */
export const applyGoldPickup = (state: GameState): GameState => {
	const pile = state.goldPiles.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (pile === undefined) {
		return state;
	}
	return {
		...state,
		goldCollected: state.goldCollected + pile.amount,
		goldPiles: state.goldPiles.filter((candidate) => candidate !== pile),
		events: buildEventLog(state.events, [
			{ type: "gold-collected", payload: { amount: pile.amount } },
		]),
	};
};
