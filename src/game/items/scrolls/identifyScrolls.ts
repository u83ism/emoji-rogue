import {
	buildEventLog,
	type ItemKind,
	POTION_KIND_VALUES,
	SCROLL_KIND_VALUES,
} from "../../events.js";
import type { GameState } from "../../state.js";
import { applyScrollWasted } from "../equipment/equipmentScrolls.js";

/** Original Rogue's identify scrolls (S_ID_POTION …), each naming one kind of thing. */
export const IDENTIFY_SCROLL_KINDS = [
	"identify-potion-scroll",
	"identify-scroll-scroll",
] as const satisfies readonly ItemKind[];

export type IdentifyScrollKind = (typeof IDENTIFY_SCROLL_KINDS)[number];

/** Narrows an ItemKind to IdentifyScrollKind. */
export const isIdentifyScrollKind = (
	kind: ItemKind,
): kind is IdentifyScrollKind =>
	IDENTIFY_SCROLL_KINDS.some((scroll) => scroll === kind);

/** What each identify scroll can be pointed at. */
export const IDENTIFY_SCROLL_TARGETS: Readonly<
	Record<IdentifyScrollKind, (kind: ItemKind) => boolean>
> = {
	"identify-potion-scroll": (kind) =>
		POTION_KIND_VALUES.some((potion) => potion === kind),
	"identify-scroll-scroll": (kind) =>
		SCROLL_KIND_VALUES.some((scroll) => scroll === kind),
};

/**
 * An identify scroll, as original Rogue's read_scroll() with whatis():
 * names the kind of the held item `targetItemId` points at, of the sort
 * the scroll identifies (IDENTIFY_SCROLL_TARGETS) — the player picks it
 * (inventoryKeymap.ts's filterScrollTargets). Pointed at nothing fitting,
 * the scroll is wasted ("you don't have anything appropriate to
 * identify"). Picking one already known still uses the scroll up.
 */
export const applyUseIdentifyScroll = (
	state: GameState,
	scroll: IdentifyScrollKind,
	targetItemId: number | undefined,
): GameState => {
	const target = state.inventory.find(
		(item) =>
			item.itemId === targetItemId &&
			IDENTIFY_SCROLL_TARGETS[scroll](item.kind),
	);
	if (target === undefined) {
		return applyScrollWasted(state, scroll);
	}
	return {
		...state,
		identifiedItemKinds: state.identifiedItemKinds.includes(target.kind)
			? state.identifiedItemKinds
			: [...state.identifiedItemKinds, target.kind],
		events: buildEventLog(state.events, [
			{ type: "item-kind-identified", payload: { kind: target.kind } },
		]),
	};
};
