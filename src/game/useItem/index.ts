import type { ItemKind } from "../events.js";
import { removeFromInventory } from "../inventory.js";
import type { GameState } from "../state.js";
import { applyUseShield, applyUseSword } from "./equipment.js";
import { applyUseFood } from "./food.js";
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
 * Uses one held item of `kind`, dispatching to the per-category handler with
 * the already-decremented inventory. Using a kind not held is a no-op (same
 * reference, no turn spent), and a handler may itself return the input state
 * unchanged to signal the same (a wand with no visible target, an identify
 * scroll with nothing left to identify).
 *
 * The switch is deliberately exhaustive with no default: adding an ItemKind
 * without wiring a handler here must be a compile error, never a silent
 * fallthrough into some other item's effect.
 */
export const applyUseItem = (state: GameState, kind: ItemKind): GameState => {
	const held = state.inventory.find((entry) => entry.kind === kind);
	if (held === undefined) {
		return state;
	}
	const inventory = removeFromInventory(state.inventory, kind);

	switch (kind) {
		case "sword":
			return applyUseSword(state, inventory);
		case "shield":
			return applyUseShield(state, inventory);
		case "enchant-weapon":
			return applyUseEnchantWeaponScroll(state, inventory);
		case "enchant-armor":
			return applyUseEnchantArmorScroll(state, inventory);
		case "protect-armor":
			return applyUseProtectArmorScroll(state, inventory);
		case "scroll":
			return applyUseTeleportScroll(state, inventory);
		case "mapping":
			return applyUseMappingScroll(state, inventory);
		case "identify":
			return applyUseIdentifyScroll(state, inventory);
		case "food":
			return applyUseFood(state, inventory);
		case "ring":
		case "sustenance":
			return applyUseRing(state, inventory, kind);
		case "wand":
			return applyUseStrikingWand(state, inventory);
		case "slow":
			return applyUseSlowWand(state, inventory);
		case "potion":
		case "poison":
		case "strength":
		case "confusion":
		case "levitation":
		case "blindness":
		case "paralysis":
		case "raise-level":
		case "detect-monster":
		case "life":
			return applyUsePotion(state, inventory, kind);
	}
};
