import type { Rng } from "../../rng.js";
import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT,
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
	WAND_CHARGES_MAX,
	WAND_CHARGES_MIN,
	WEAPON_CURSE_CHANCE_PERCENT,
	WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT,
} from "../balance.js";
import {
	ARMOR_KIND_VALUES,
	hasItemIdentity,
	type ItemKind,
	WEAPON_KIND_VALUES,
} from "../events.js";
import type { HeldItem, Item, Position } from "../state.js";
import { ARMOR_STATS, WEAPON_STATS } from "./equipmentKinds.js";

/**
 * How a weapon/armor/ring's identity is rolled and how a floor Item becomes
 * a HeldItem — split out of items/pickups.ts (milestone 81 follow-up) once
 * that file grew past the 200-line structure-lint limit. Identity (which
 * weapon/armor it is, curse, bonus, itemId) is rolled once, at floor
 * generation — see buildFloorItem — never re-rolled afterward; picking one
 * up is just reading that already-decided data off the floor Item
 * (toHeldItem).
 */

/** One kind out of `kinds`, each as likely as its spawnWeight — original Rogue's pick_one() over a weighted table. Consumes `rng` once. */
const drawWeightedKind = <Kind extends string>(
	rng: Rng,
	kinds: readonly Kind[],
	stats: Readonly<Record<Kind, { readonly spawnWeight: number }>>,
): Kind => {
	const totalWeight = kinds.reduce(
		(sum, kind) => sum + stats[kind].spawnWeight,
		0,
	);
	let remaining = rng.getUniformInt(0, totalWeight - 1);
	for (const kind of kinds) {
		remaining -= stats[kind].spawnWeight;
		if (remaining < 0) {
			return kind;
		}
	}
	throw new Error("unreachable: the roll is below the total weight");
};

/**
 * Original Rogue's found-weapon/armor roll (see balance.ts's
 * WEAPON_CURSE_CHANCE_PERCENT): one percent roll picks cursed / found
 * enchanted / ordinary, and only the first two roll a second time for how
 * many points the bonus moves (down for a curse, up for an enchantment).
 */
const rollFoundBonus = (
	rng: Rng,
	curseChancePercent: number,
	enchantedChancePercent: number,
): { readonly cursed: boolean; readonly bonus: number } => {
	const roll = rng.getUniformInt(0, 99);
	if (roll >= curseChancePercent + enchantedChancePercent) {
		return { cursed: false, bonus: 0 };
	}
	const adjustment = rng.getUniformInt(
		FOUND_BONUS_ADJUSTMENT_MIN,
		FOUND_BONUS_ADJUSTMENT_MAX,
	);
	return roll < curseChancePercent
		? { cursed: true, bonus: -adjustment }
		: { cursed: false, bonus: adjustment };
};

/**
 * The floor Item a weapon/armor/ring spawn becomes: its identity rolled
 * here, at generation time, consuming `rng` directly — a live, mutating Rng
 * (see rng.ts), matching floor generation's existing idiom (unlike the
 * RngState-wrapping pattern items/equipment.ts and turnEnd/ use for rolls
 * that happen mid-run). A weapon or armor first draws which kind it is
 * (weighted, see items/equipmentKinds.ts) — a bundled weapon kind also how
 * many — then its found bonus — which for
 * a weapon moves the to-hit bonus only, as in original Rogue. A consumable
 * kind is returned as-is; it has no identity concept and never consumes
 * `rng` here (its itemId is assigned lazily, at pickup — see
 * items/pickups.ts). Rings roll nothing either: the aggravate-monster ring
 * is always cursed and the other kinds (none of which carries a numeric
 * value a curse could turn negative) never are.
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
	switch (kind) {
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
			return {
				...position,
				kind,
				identity: {
					itemId,
					charges: rng.getUniformInt(WAND_CHARGES_MIN, WAND_CHARGES_MAX),
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
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
			return { ...position, kind, identity: { itemId, cursed: false } };
		case "aggravate-monster-ring":
			return { ...position, kind, identity: { itemId, cursed: true } };
	}
};

/**
 * The HeldItem a picked-up floor Item becomes: for a weapon/armor/ring, its
 * already-rolled `identity` verbatim (plus `equipped: false` — meaningless
 * on the ground); for a consumable, which has no identity concept, a fresh
 * `freshItemId` (items/pickups.ts passes state.nextItemId, and only bumps
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
			return { kind: item.kind, equipped: false, ...item.identity };
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
			return { kind: item.kind, ...item.identity };
		default:
			return { itemId: freshItemId, kind: item.kind };
	}
};
