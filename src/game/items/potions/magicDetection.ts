import { buildEventLog } from "../../events.js";
import type { GameState, Item, SensedItem } from "../../state.js";

/**
 * Original Rogue's is_magic() on a floor item: a potion, scroll, ring or
 * wand; a weapon with a bonus; armor off its base value or protected.
 */
const isMagicFloorItem = (item: Item): boolean => {
	if (item.kind === "weapon") {
		return item.identity.hitBonus !== 0 || item.identity.damageBonus !== 0;
	}
	if (item.kind === "armor") {
		return item.identity.defenseBonus !== 0 || item.identity.rustProtected;
	}
	return item.kind !== "food-ration";
};

/**
 * A potion of magic detection, as original Rogue's quaff() (P_TFIND): every
 * magic thing on the floor — and every monster carrying one, at the monster
 * — shows for the turn (sensedItems); known then. Finding none, only a
 * strange feeling passes.
 */
export const applyMagicDetectionPotion = (state: GameState): GameState => {
	const onFloor = state.items.filter(isMagicFloorItem);
	const carried = state.enemies.filter((enemy) =>
		enemy.carried.some(isMagicFloorItem),
	);
	const amulet = state.amulet === undefined ? [] : [state.amulet];
	const sensedItems: SensedItem[] = [...onFloor, ...carried, ...amulet].map(
		(thing) => ({ x: thing.x, y: thing.y, kind: "magic" }),
	);
	return {
		...state,
		sensedItems,
		events: buildEventLog(state.events, [
			{ type: "magic-detected", payload: { count: sensedItems.length } },
		]),
	};
};
