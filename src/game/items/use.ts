import type { ItemKind } from "../events.js";
import type { GameState } from "../state.js";
import { applyUseArmor, applyUseSword } from "./equipment.js";
import { applyUseFood } from "./food.js";
import { removeFromInventory } from "./inventory.js";
import { applyUsePotion } from "./potions.js";
import { applyUseRing } from "./rings.js";
import {
	applyUseEnchantArmorScroll,
	applyUseEnchantWeaponScroll,
	applyUseIdentifyScroll,
	applyUseMappingScroll,
	applyUseProtectArmorScroll,
	applyUseTeleportScroll,
} from "./scrolls.js";
import { applyUseSlowWand, applyUseStrikingWand } from "./wands.js";

/**
 * The per-kind effect, without inventory consumption. Deliberately
 * exhaustive with no default: adding an ItemKind without wiring a handler
 * here must be a compile error, never a silent fallthrough into some other
 * item's effect. A handler may return the input state unchanged (same
 * reference) to signal "nothing happened" — a wand with no visible target,
 * an identify scroll with nothing left to identify.
 */
const applyItemEffect = (state: GameState, kind: ItemKind): GameState => {
	switch (kind) {
		case "sword":
			return applyUseSword(state);
		case "armor":
			return applyUseArmor(state);
		case "enchant-weapon":
			return applyUseEnchantWeaponScroll(state);
		case "enchant-armor":
			return applyUseEnchantArmorScroll(state);
		case "protect-armor":
			return applyUseProtectArmorScroll(state);
		case "teleport-scroll":
			return applyUseTeleportScroll(state);
		case "mapping-scroll":
			return applyUseMappingScroll(state);
		case "identify-scroll":
			return applyUseIdentifyScroll(state);
		case "food":
			return applyUseFood(state);
		case "regeneration-ring":
		case "sustenance-ring":
			return applyUseRing(state, kind);
		case "striking-wand":
			return applyUseStrikingWand(state);
		case "slow-wand":
			return applyUseSlowWand(state);
		case "heal-potion":
		case "poison":
		case "strength":
		case "confusion":
		case "levitation":
		case "blindness":
		case "paralysis":
		case "raise-level":
		case "detect-monster":
		case "life":
			return applyUsePotion(state, kind);
	}
};

/**
 * Uses one held item of `kind`: the effect from applyItemEffect, then one
 * item consumed from inventory — in this one place only, so a handler can
 * never forget to consume (the structural fix for a contract that used to
 * live in every handler). Using a kind not held, or a kind whose handler
 * declared a no-op, returns the input state (same reference, no turn spent,
 * nothing consumed).
 */
export const applyUseItem = (state: GameState, kind: ItemKind): GameState => {
	const held = state.inventory.find((entry) => entry.kind === kind);
	if (held === undefined) {
		return state;
	}
	const afterEffect = applyItemEffect(state, kind);
	if (afterEffect === state) {
		return state;
	}
	return {
		...afterEffect,
		inventory: removeFromInventory(state.inventory, kind),
	};
};
