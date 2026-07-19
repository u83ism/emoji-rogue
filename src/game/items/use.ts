import { EQUIPMENT_ITEM_KINDS } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { applyToggleArmorEquip, applyToggleSwordEquip } from "./equipment.js";
import { applyUseFood } from "./food.js";
import { removeHeldItem } from "./inventory.js";
import { applyUsePotion } from "./potions.js";
import { applyToggleRingEquip } from "./rings.js";
import {
	applyUseEnchantArmorScroll,
	applyUseEnchantWeaponScroll,
	applyUseIdentifyScroll,
	applyUseMappingScroll,
	applyUseProtectArmorScroll,
	applyUseRemoveCurseScroll,
	applyUseTeleportScroll,
} from "./scrolls.js";
import { applyUseSlowWand, applyUseStrikingWand } from "./wands.js";

/**
 * The per-item effect. Deliberately exhaustive with no default: adding an
 * ItemKind without wiring a handler here must be a compile error, never a
 * silent fallthrough into some other item's effect. Sword/armor/ring toggle
 * equip state instead of being consumed — see applyUseItem, which reads
 * item.kind (not a same-reference check) to decide whether to remove the
 * item from inventory afterward. Every other handler may return the input
 * state unchanged (same reference) to signal "nothing happened", which
 * applyUseItem reads as "don't consume" — a wand with no visible target, an
 * identify scroll with nothing left to identify, a targeted scroll with no
 * matching target.
 */
const applyItemEffect = (
	state: GameState,
	item: HeldItem,
	targetItemId: number | undefined,
): GameState => {
	switch (item.kind) {
		case "sword":
			return applyToggleSwordEquip(state, item);
		case "armor":
			return applyToggleArmorEquip(state, item);
		case "regeneration-ring":
		case "sustenance-ring":
			return applyToggleRingEquip(state, item);
		case "enchant-weapon":
			return applyUseEnchantWeaponScroll(state, targetItemId);
		case "enchant-armor":
			return applyUseEnchantArmorScroll(state, targetItemId);
		case "protect-armor":
			return applyUseProtectArmorScroll(state, targetItemId);
		case "remove-curse-scroll":
			return applyUseRemoveCurseScroll(state);
		case "teleport-scroll":
			return applyUseTeleportScroll(state);
		case "mapping-scroll":
			return applyUseMappingScroll(state);
		case "identify-scroll":
			return applyUseIdentifyScroll(state);
		case "food":
			return applyUseFood(state);
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
			return applyUsePotion(state, item.kind);
	}
};

/**
 * Uses the held item matching `itemId`: the effect from applyItemEffect,
 * then — for consumable kinds only — one item removed from inventory, in
 * this one place so a handler can never forget to consume. Sword/armor/ring
 * are never removed here; toggling their `equipped` flag in place is the
 * whole effect (see items/equipment.ts, items/rings.ts). Using an itemId not
 * held, or a kind whose handler declared a no-op, returns the input state
 * (same reference, no turn spent, nothing consumed).
 */
export const applyUseItem = (
	state: GameState,
	itemId: number,
	targetItemId: number | undefined,
): GameState => {
	const item = state.inventory.find((entry) => entry.itemId === itemId);
	if (item === undefined) {
		return state;
	}
	const afterEffect = applyItemEffect(state, item, targetItemId);
	if (EQUIPMENT_ITEM_KINDS.includes(item.kind)) {
		return afterEffect;
	}
	if (afterEffect === state) {
		return state;
	}
	return {
		...afterEffect,
		inventory: removeHeldItem(afterEffect.inventory, itemId),
	};
};
