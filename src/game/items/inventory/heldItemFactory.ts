import type { Rng } from "../../../rng.js";
import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT,
	LIGHT_WAND_CHARGES_MAX,
	LIGHT_WAND_CHARGES_MIN,
	WAND_CHARGES_MAX,
	WAND_CHARGES_MIN,
	WEAPON_CURSE_CHANCE_PERCENT,
	WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT,
} from "../../balance.js";
import {
	ARMOR_KIND_VALUES,
	hasItemIdentity,
	type ItemKind,
	isRingKind,
	WEAPON_KIND_VALUES,
} from "../../events.js";
import type { HeldItem, Item, Position } from "../../state.js";
import { ARMOR_STATS, WEAPON_STATS } from "../equipment/equipmentKinds.js";
import {
	buildFloorRing,
	drawWeightedKind,
	rollFoundBonus,
} from "../identityRolls.js";

/**
 * How a weapon/armor/ring's identity is rolled and how a floor Item becomes
 * a HeldItem — split out of items/inventory/pickups.ts (milestone 81 follow-up) once
 * that file grew past the 200-line structure-lint limit. Identity (which
 * weapon/armor it is, curse, bonus, itemId) is rolled once, at floor
 * generation — see buildFloorItem — never re-rolled afterward; picking one
 * up is just reading that already-decided data off the floor Item
 * (toHeldItem).
 */

/**
 * The floor Item a weapon/armor/ring spawn becomes: its identity rolled
 * here, at generation time, consuming `rng` directly — a live, mutating Rng
 * (see rng.ts), matching floor generation's existing idiom (unlike the
 * RngState-wrapping pattern items/equipment/equipment.ts and turnEnd/ use for rolls
 * that happen mid-run). A weapon or armor first draws which kind it is
 * (weighted, see items/equipment/equipmentKinds.ts) — a bundled weapon kind also how
 * many — then its found bonus — which for
 * a weapon moves the to-hit bonus only, as in original Rogue. A consumable
 * kind is returned as-is; it has no identity concept and never consumes
 * `rng` here (its itemId is assigned lazily, at pickup — see
 * items/inventory/pickups.ts). Rings are buildFloorRing's.
 */
export const buildFloorItem = (
	kind: ItemKind,
	itemId: number,
	position: Position,
	rng: Rng,
): Item => {
	if (!hasItemIdentity(kind)) {
		return { ...position, kind };
	}
	if (isRingKind(kind)) {
		return buildFloorRing(kind, itemId, position, rng);
	}
	switch (kind) {
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
		case "cold-wand":
		case "fire-wand":
		case "light-wand":
		case "nothing-wand":
		case "teleport-to-wand":
		case "haste-monster-wand":
			return {
				...position,
				kind,
				identity: {
					itemId,
					charges:
						kind === "light-wand"
							? rng.getUniformInt(
									LIGHT_WAND_CHARGES_MIN,
									LIGHT_WAND_CHARGES_MAX,
								)
							: rng.getUniformInt(WAND_CHARGES_MIN, WAND_CHARGES_MAX),
				},
			};
		case "weapon": {
			const weaponKind = drawWeightedKind(
				rng,
				WEAPON_KIND_VALUES,
				WEAPON_STATS,
			);
			const { stackMin, stackMax } = WEAPON_STATS[weaponKind];
			const quantity =
				stackMax > stackMin ? rng.getUniformInt(stackMin, stackMax) : stackMin;
			const found = rollFoundBonus(
				rng,
				WEAPON_CURSE_CHANCE_PERCENT,
				WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT,
			);
			return {
				...position,
				kind: "weapon",
				identity: {
					itemId,
					weaponKind,
					cursed: found.cursed,
					hitBonus: found.bonus,
					damageBonus: 0,
					quantity,
				},
			};
		}
		case "armor": {
			const armorKind = drawWeightedKind(rng, ARMOR_KIND_VALUES, ARMOR_STATS);
			const found = rollFoundBonus(
				rng,
				ARMOR_CURSE_CHANCE_PERCENT,
				ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT,
			);
			return {
				...position,
				kind: "armor",
				identity: {
					itemId,
					armorKind,
					cursed: found.cursed,
					defenseBonus: found.bonus,
					rustProtected: false,
				},
			};
		}
	}
};

/**
 * The HeldItem a picked-up floor Item becomes: for a weapon/armor/ring, its
 * already-rolled `identity` verbatim (plus `equipped: false` — meaningless
 * on the ground); for a consumable, which has no identity concept, a fresh
 * `freshItemId` (items/inventory/pickups.ts passes state.nextItemId, and only bumps
 * its own counter when this branch actually runs).
 */
export const toHeldItem = (item: Item, freshItemId: number): HeldItem => {
	switch (item.kind) {
		case "weapon":
			return { kind: "weapon", equipped: false, ...item.identity };
		case "armor":
			return { kind: "armor", equipped: false, ...item.identity };
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
			return { kind: item.kind, equipped: false, ...item.identity };
		case "protection-ring":
		case "add-strength-ring":
		case "dexterity-ring":
		case "increase-damage-ring":
			return { kind: item.kind, equipped: false, ...item.identity };
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
		case "cold-wand":
		case "fire-wand":
		case "light-wand":
		case "nothing-wand":
		case "teleport-to-wand":
		case "haste-monster-wand":
			return { kind: item.kind, ...item.identity };
		default:
			return { itemId: freshItemId, kind: item.kind };
	}
};
