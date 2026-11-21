import {
	buildEventLog,
	EQUIPMENT_ITEM_KINDS,
	IDENTIFIABLE_ITEM_KINDS,
	type ItemKind,
	isWandKind,
} from "../events.js";
import { revealsItemKind } from "../identification.js";
import type { Direction, GameState, HeldItem } from "../state.js";
import {
	applyToggleArmorEquip,
	applyToggleWeaponEquip,
} from "./equipment/equipment.js";
import {
	applyUseEnchantArmorScroll,
	applyUseEnchantWeaponScroll,
	applyUseProtectArmorScroll,
	applyUseRemoveCurseScroll,
} from "./equipment/equipmentScrolls.js";
import { applyUseFood } from "./food.js";
import { removeHeldItem, replaceHeldItem } from "./inventory/inventory.js";
import { applyUsePotion } from "./potions.js";
import { applyToggleRingEquip } from "./rings.js";
import {
	applyUseAggravateMonstersScroll,
	applyUseConfuseMonsterScroll,
	applyUseCreateMonsterScroll,
	applyUseHoldMonsterScroll,
	applyUseIdentifyScroll,
	applyUseMappingScroll,
	applyUseSleepScroll,
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
	direction: Direction | undefined,
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
		case "protection-ring":
		case "add-strength-ring":
		case "sustain-strength-ring":
		case "adornment-ring":
		case "dexterity-ring":
		case "increase-damage-ring":
		case "teleportation-ring":
		case "maintain-armor-ring":
		case "see-invisible-ring":
		case "searching-ring":
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
		case "sleep-scroll":
			return applyUseSleepScroll(state);
		case "create-monster-scroll":
			return applyUseCreateMonsterScroll(state);
		case "aggravate-monsters-scroll":
			return applyUseAggravateMonstersScroll(state);
		case "food":
			return applyUseFood(state);
		case "slow-wand":
			return applyUseSlowWand(state, direction);
		case "teleport-wand":
			return applyUseTeleportWand(state, direction);
		case "magic-missile-wand":
			return applyUseMagicMissileWand(state, direction);
		case "heal-potion":
		case "poison":
		case "strength":
		case "confusion":
		case "levitation":
		case "blindness":
		case "raise-level":
		case "detect-monster":
		case "hallucination":
		case "restore-strength-potion":
		case "extra-healing-potion":
		case "haste-self-potion":
		case "see-invisible-potion":
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
 * this one place so a handler can never forget to consume. A wand instead
 * spends one charge, and with none left only logs wand-empty (the turn
 * still passes, as original Rogue's do_zap()). Weapon/armor/ring
 * are never removed here; toggling their `equipped` flag in place is the
 * whole effect (see items/equipment/equipment.ts, items/rings.ts). Using an itemId not
 * held, or a kind whose handler declared a no-op, returns the input state
 * (same reference, no turn spent, nothing consumed). A use that takes
 * effect identifies the item's kind for the rest of the run (see
 * GameState.identifiedItemKinds) — unless it is a potion or scroll whose
 * effect did not show (identification.ts's revealsItemKind).
 */
export const applyUseItem = (
	state: GameState,
	itemId: number,
	targetItemId: number | undefined,
	direction?: Direction,
): GameState => {
	const item = state.inventory.find((entry) => entry.itemId === itemId);
	if (item === undefined) {
		return state;
	}
	if (isWandKind(item.kind) && "charges" in item && item.charges === 0) {
		/* original Rogue's do_zap(): "nothing happens" — the turn still passes */
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "wand-empty", payload: { kind: item.kind } },
			]),
		};
	}
	const afterEffect = applyItemEffect(state, item, targetItemId, direction);
	if (afterEffect === state) {
		return state;
	}
	const identified = revealsItemKind(item.kind, state, afterEffect)
		? {
				...afterEffect,
				identifiedItemKinds: identifyItemKind(
					afterEffect.identifiedItemKinds,
					item.kind,
				),
			}
		: afterEffect;
	if (EQUIPMENT_ITEM_KINDS.includes(item.kind)) {
		return identified;
	}
	if ("charges" in item) {
		/* a zap spends a charge; the wand itself stays */
		return {
			...identified,
			inventory: replaceHeldItem(identified.inventory, itemId, {
				...item,
				charges: item.charges - 1,
			}),
		};
	}
	return {
		...identified,
		inventory: removeHeldItem(identified.inventory, itemId),
	};
};
