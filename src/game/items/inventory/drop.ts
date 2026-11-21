import { buildEventLog } from "../../events.js";
import type { GameState, HeldItem, Item, Position } from "../../state.js";
import { toItemEventPayload } from "../equipment/equipmentKinds.js";
import { removeHeldItem } from "./inventory.js";

/**
 * The floor Item a dropped HeldItem becomes. A weapon/armor/ring carries its
 * already-rolled identity (itemId, curse, bonus) along so picking it back up
 * restores the exact same item instead of rolling a fresh one — see Item's
 * doc comment for why this field exists.
 */
const toFloorItem = (item: HeldItem, position: Position): Item => {
	switch (item.kind) {
		case "weapon":
			return {
				...position,
				kind: "weapon",
				identity: {
					itemId: item.itemId,
					weaponKind: item.weaponKind,
					cursed: item.cursed,
					hitBonus: item.hitBonus,
					damageBonus: item.damageBonus,
					quantity: item.quantity,
				},
			};
		case "armor":
			return {
				...position,
				kind: "armor",
				identity: {
					itemId: item.itemId,
					armorKind: item.armorKind,
					cursed: item.cursed,
					defenseBonus: item.defenseBonus,
					rustProtected: item.rustProtected,
				},
			};
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "aggravate-monster-ring":
		case "sustain-strength-ring":
		case "adornment-ring":
		case "teleportation-ring":
		case "maintain-armor-ring":
		case "see-invisible-ring":
		case "searching-ring":
			return {
				...position,
				kind: item.kind,
				identity: { itemId: item.itemId, cursed: item.cursed },
			};
		case "protection-ring":
		case "add-strength-ring":
		case "dexterity-ring":
		case "increase-damage-ring":
			return {
				...position,
				kind: item.kind,
				identity: {
					itemId: item.itemId,
					cursed: item.cursed,
					bonus: item.bonus,
				},
			};
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
		case "drain-life-wand":
		case "lightning-wand":
		case "cold-wand":
		case "fire-wand":
		case "light-wand":
		case "nothing-wand":
		case "teleport-to-wand":
		case "haste-monster-wand":
			return {
				...position,
				kind: item.kind,
				identity: { itemId: item.itemId, charges: item.charges },
			};
		default:
			return { ...position, kind: item.kind };
	}
};

/**
 * Drops the held item matching `itemId` onto the tile under the player. A
 * no-op (same reference) when `itemId` is not held, or when it is a
 * currently-equipped cursed weapon/armor/ring — a cursed item can't be
 * removed at all while equipped (logs equip-blocked-cursed, same as trying
 * to unequip it directly; see items/equipment/equipment.ts and items/rings/rings.ts), so
 * dropping it must not be a back door around that lock. If an item already
 * lies on that exact tile (the player is standing on one it never picked up
 * — INVENTORY_CAPACITY refused it, or a teleport landed there), the two
 * simply share the tile; picking either back up
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
			{ type: "item-dropped", payload: toItemEventPayload(item) },
		]),
	};
};
