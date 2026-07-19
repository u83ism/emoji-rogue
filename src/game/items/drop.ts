import { buildEventLog } from "../events.js";
import type { GameState, HeldItem, Item, Position } from "../state.js";
import { removeHeldItem } from "./inventory.js";

/**
 * The floor Item a dropped HeldItem becomes. A sword/armor/ring carries its
 * already-rolled identity (itemId, curse, bonus) along so picking it back up
 * restores the exact same item instead of rolling a fresh one — see Item's
 * doc comment for why this field exists.
 */
const toFloorItem = (item: HeldItem, position: Position): Item => {
	switch (item.kind) {
		case "sword":
			return {
				...position,
				kind: "sword",
				identity: {
					itemId: item.itemId,
					cursed: item.cursed,
					attackBonus: item.attackBonus,
				},
			};
		case "armor":
			return {
				...position,
				kind: "armor",
				identity: {
					itemId: item.itemId,
					cursed: item.cursed,
					defenseBonus: item.defenseBonus,
					rustProtected: item.rustProtected,
				},
			};
		case "regeneration-ring":
		case "sustenance-ring":
			return {
				...position,
				kind: item.kind,
				identity: { itemId: item.itemId, cursed: item.cursed },
			};
		default:
			return { ...position, kind: item.kind };
	}
};

/**
 * Drops the held item matching `itemId` onto the tile under the player. A
 * no-op (same reference) when `itemId` is not held, or when it is a
 * currently-equipped cursed sword/armor/ring — a cursed item can't be
 * removed at all while equipped (logs equip-blocked-cursed, same as trying
 * to unequip it directly; see items/equipment.ts and items/rings.ts), so
 * dropping it must not be a back door around that lock. If an item already
 * lies on that exact tile (only reachable by dropping while standing on a
 * kind that couldn't be picked up due to INVENTORY_CAPACITY — see
 * applyItemPickup), the two simply share the tile; picking either back up
 * takes repeated visits, an accepted rare edge case.
 */
export const applyItemDrop = (state: GameState, itemId: number): GameState => {
	const item = state.inventory.find((entry) => entry.itemId === itemId);
	if (item === undefined) {
		return state;
	}
	if ("equipped" in item && item.equipped && item.cursed) {
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "equip-blocked-cursed", payload: { kind: item.kind } },
			]),
		};
	}
	return {
		...state,
		inventory: removeHeldItem(state.inventory, itemId),
		items: [
			...state.items,
			toFloorItem(item, { x: state.player.x, y: state.player.y }),
		],
		events: buildEventLog(state.events, [
			{ type: "item-dropped", payload: { kind: item.kind } },
		]),
	};
};
