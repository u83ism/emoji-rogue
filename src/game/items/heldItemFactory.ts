import type { Rng } from "../../rng.js";
import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_DEFENSE_BONUS,
	RING_CURSE_CHANCE_PERCENT,
	SWORD_ATTACK_BONUS,
	SWORD_CURSE_CHANCE_PERCENT,
} from "../balance.js";
import { type ItemKind, isEquipmentItemKind } from "../events.js";
import type { HeldItem, Item, Position } from "../state.js";

/**
 * How a sword/armor/ring's identity is rolled and how a floor Item becomes a
 * HeldItem — split out of items/pickups.ts (milestone 81 follow-up) once
 * that file grew past the 200-line structure-lint limit. Identity (curse,
 * starting bonus, itemId) is rolled once, at floor generation — see
 * buildFloorItem — never re-rolled afterward; picking one up is just reading
 * that already-decided data off the floor Item (toHeldItem).
 */

/**
 * The floor Item a sword/armor/ring spawn becomes: its identity (curse,
 * starting bonus, itemId) rolled here, at generation time, consuming `rng`
 * directly — a live, mutating Rng (see rng.ts), matching floor generation's
 * existing idiom (unlike the RngState-wrapping pattern items/equipment.ts
 * and turnEnd/ use for rolls that happen mid-run). A consumable kind is
 * returned as-is; it has no identity concept and never consumes `rng` here
 * (its itemId is assigned lazily, at pickup — see items/pickups.ts).
 */
export const buildFloorItem = (
	kind: ItemKind,
	itemId: number,
	position: Position,
	rng: Rng,
): Item => {
	if (!isEquipmentItemKind(kind)) {
		return { ...position, kind };
	}
	switch (kind) {
		case "sword":
			return {
				...position,
				kind: "sword",
				identity: {
					itemId,
					cursed: rng.getUniformInt(0, 99) < SWORD_CURSE_CHANCE_PERCENT,
					attackBonus: SWORD_ATTACK_BONUS,
				},
			};
		case "armor":
			return {
				...position,
				kind: "armor",
				identity: {
					itemId,
					cursed: rng.getUniformInt(0, 99) < ARMOR_CURSE_CHANCE_PERCENT,
					defenseBonus: ARMOR_DEFENSE_BONUS,
					rustProtected: false,
				},
			};
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "awareness-ring":
			return {
				...position,
				kind,
				identity: {
					itemId,
					cursed: rng.getUniformInt(0, 99) < RING_CURSE_CHANCE_PERCENT,
				},
			};
	}
};

/**
 * The HeldItem a picked-up floor Item becomes: for a sword/armor/ring, its
 * already-rolled `identity` verbatim (plus `equipped: false` — meaningless
 * on the ground); for a consumable, which has no identity concept, a fresh
 * `freshItemId` (items/pickups.ts passes state.nextItemId, and only bumps
 * its own counter when this branch actually runs).
 */
export const toHeldItem = (item: Item, freshItemId: number): HeldItem => {
	switch (item.kind) {
		case "sword":
			return { kind: "sword", equipped: false, ...item.identity };
		case "armor":
			return { kind: "armor", equipped: false, ...item.identity };
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "awareness-ring":
			return { kind: item.kind, equipped: false, ...item.identity };
		default:
			return { itemId: freshItemId, kind: item.kind };
	}
};
