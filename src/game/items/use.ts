import {
	buildEventLog,
	EQUIPMENT_ITEM_KINDS,
	IDENTIFIABLE_ITEM_KINDS,
	type ItemKind,
	isWandKind,
} from "../events.js";
import { revealsItemKind } from "../identification.js";
import type { Direction, GameState } from "../state.js";
import { removeHeldItem, replaceHeldItem } from "./inventory/inventory.js";
import { applyItemEffect } from "./itemEffect.js";

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
 * whole effect (see items/equipment/equipment.ts, items/rings/rings.ts). Using an itemId not
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
