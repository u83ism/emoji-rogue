import {
	EQUIPMENT_ITEM_KINDS,
	IDENTIFIABLE_ITEM_KINDS,
	type ItemKind,
} from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { applyToggleArmorEquip, applyToggleWeaponEquip } from "./equipment.js";
import {
	applyUseEnchantArmorScroll,
	applyUseEnchantWeaponScroll,
	applyUseProtectArmorScroll,
	applyUseRemoveCurseScroll,
} from "./equipmentScrolls.js";
import { applyUseFood } from "./food.js";
import { removeHeldItem } from "./inventory.js";
import { applyUsePotion } from "./potions.js";
import { applyToggleRingEquip } from "./rings.js";
import {
	applyUseConfuseMonsterScroll,
	applyUseHoldMonsterScroll,
	applyUseIdentifyScroll,
	applyUseMappingScroll,
	applyUseTeleportScroll,
} from "./scrolls.js";
import {
	applyUseMagicMissileWand,
	applyUseSlowWand,
	applyUseTeleportWand,
} from "./wands.js";

/**
 * The per-item effect. Deliberately exhaustive with no default: adding an
 * ItemKind without wiring a handler here must be a compile error, never a
 * silent fallthrough into some other item's effect. Weapon/armor/ring toggle
 * equip state instead of being consumed — see applyUseItem, which reads
 * item.kind (not a same-reference check) to decide whether to remove the
 * item from inventory afterward. Every other handler may return the input
 * state unchanged (same reference) to signal "nothing happened", which
 * applyUseItem reads as "don't consume" — a wand with no visible target.
 * A scroll is always used up once read, even when it finds nothing to work
 * on (original Rogue's read_scroll()) — see applyScrollWasted.
 */
const applyItemEffect = (
	state: GameState,
	item: HeldItem,
	targetItemId: number | undefined,
): GameState => {
	switch (item.kind) {
		case "weapon":
			return applyToggleWeaponEquip(state, item);
		case "armor":
			return applyToggleArmorEquip(state, item);
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "aggravate-monster-ring":
			return applyToggleRingEquip(state, item);
		case "enchant-weapon":
			return applyUseEnchantWeaponScroll(state);
		case "enchant-armor":
			return applyUseEnchantArmorScroll(state);
		case "protect-armor":
			return applyUseProtectArmorScroll(state);
		case "remove-curse-scroll":
			return applyUseRemoveCurseScroll(state);
		case "teleport-scroll":
			return applyUseTeleportScroll(state);
		case "mapping-scroll":
			return applyUseMappingScroll(state);
		case "identify-scroll":
			return applyUseIdentifyScroll(state, targetItemId);
		case "confuse-monster-scroll":
			return applyUseConfuseMonsterScroll(state);
		case "hold-monster-scroll":
			return applyUseHoldMonsterScroll(state);
		case "food":
			return applyUseFood(state);
		case "slow-wand":
			return applyUseSlowWand(state);
		case "teleport-wand":
			return applyUseTeleportWand(state);
		case "magic-missile-wand":
			return applyUseMagicMissileWand(state);
		case "heal-potion":
		case "poison":
		case "strength":
		case "confusion":
		case "levitation":
		case "blindness":
		case "raise-level":
		case "detect-monster":
		case "hallucination":
			return applyUsePotion(state, item.kind);
	}
};

/** `identifiedItemKinds` with `kind` added, if it is a kind with a hidden name (IDENTIFIABLE_ITEM_KINDS) not already there. */
const identifyItemKind = (
	identifiedItemKinds: readonly ItemKind[],
	kind: ItemKind,
): readonly ItemKind[] =>
	IDENTIFIABLE_ITEM_KINDS.includes(kind) && !identifiedItemKinds.includes(kind)
		? [...identifiedItemKinds, kind]
		: identifiedItemKinds;

/**
 * Uses the held item matching `itemId`: the effect from applyItemEffect,
 * then — for consumable kinds only — one item removed from inventory, in
 * this one place so a handler can never forget to consume. Weapon/armor/ring
 * are never removed here; toggling their `equipped` flag in place is the
 * whole effect (see items/equipment.ts, items/rings.ts). Using an itemId not
 * held, or a kind whose handler declared a no-op, returns the input state
 * (same reference, no turn spent, nothing consumed). Any use that does take
 * effect identifies the item's kind for the rest of the run (see
 * GameState.identifiedItemKinds) — drinking a potion, putting on a ring and
 * zapping a wand all reveal what it was.
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
	if (afterEffect === state) {
		return state;
	}
	const identified = {
		...afterEffect,
		identifiedItemKinds: identifyItemKind(
			afterEffect.identifiedItemKinds,
			item.kind,
		),
	};
	if (EQUIPMENT_ITEM_KINDS.includes(item.kind)) {
		return identified;
	}
	return {
		...identified,
		inventory: removeHeldItem(identified.inventory, itemId),
	};
};
