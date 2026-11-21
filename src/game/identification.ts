import { encodePointKey } from "../pointkey.js";
import {
	type ItemKind,
	isRingKind,
	isWandKind,
	POTION_KIND_VALUES,
	type PotionKind,
	SCROLL_KIND_VALUES,
	type ScrollKind,
	type WandKind,
} from "./events.js";
import type { GameState } from "./state.js";
import { computePlayerVisiblePoints, findPlayerRoom } from "./vision.js";

/** Whether drinking or reading one shows what it was, judged from the state before and after. */
type Reveal = (before: GameState, after: GameState) => boolean;

const always: Reveal = () => true;
const never: Reveal = () => false;

const countHeld = (state: GameState): number =>
	state.enemies.filter((enemy) => enemy.held).length;

/**
 * Which potions and scrolls name themselves when used, as original Rogue's
 * quaff() and read_scroll() set oi_know: most always do; a few only when
 * their effect showed (a monster to detect, something frozen, a different
 * room reached, confusion felt while not hallucinating); the rest never —
 * their effect cannot be seen, and they stay known only by their look.
 */
const ITEM_REVEALS: Readonly<Record<PotionKind | ScrollKind, Reveal>> = {
	"heal-potion": always,
	poison: always,
	strength: always,
	confusion: (before) => before.hallucinatingTurnsRemaining === 0,
	levitation: always,
	blindness: always,
	"raise-level": always,
	"detect-monster": (before) => {
		const visible = computePlayerVisiblePoints(before);
		return before.enemies.some(
			(enemy) => !visible.has(encodePointKey(enemy.x, enemy.y)),
		);
	},
	hallucination: always,
	"restore-strength-potion": never,
	"extra-healing-potion": always,
	"haste-self-potion": always,
	"see-invisible-potion": never,
	"teleport-scroll": (before, after) =>
		findPlayerRoom(before) !== findPlayerRoom(after),
	"mapping-scroll": always,
	"identify-scroll": always,
	"enchant-weapon": never,
	"enchant-armor": never,
	"protect-armor": never,
	"remove-curse-scroll": never,
	"confuse-monster-scroll": never,
	"hold-monster-scroll": (before, after) =>
		countHeld(after) > countHeld(before),
	"sleep-scroll": always,
	"create-monster-scroll": never,
	"aggravate-monsters-scroll": never,
};

/**
 * Zapping names a wand only when what it does shows, as original Rogue's
 * do_zap() sets oi_know: the magic missile's bolt does; slowing or
 * teleporting a monster does not.
 */
const WAND_REVEALS: Readonly<Record<WandKind, Reveal>> = {
	"slow-wand": never,
	"teleport-wand": never,
	"magic-missile-wand": always,
	"haste-monster-wand": never,
};

const isPotionOrScrollKind = (
	kind: ItemKind,
): kind is PotionKind | ScrollKind =>
	POTION_KIND_VALUES.some((potion) => potion === kind) ||
	SCROLL_KIND_VALUES.some((scroll) => scroll === kind);

/**
 * Whether using a `kind` (the state `before` and `after` the use) names
 * it for the rest of the run. A ring never does — original Rogue's
 * ring_on() leaves it unknown; kinds without a hidden name always do.
 */
export const revealsItemKind = (
	kind: ItemKind,
	before: GameState,
	after: GameState,
): boolean => {
	if (isPotionOrScrollKind(kind)) {
		return ITEM_REVEALS[kind](before, after);
	}
	if (isWandKind(kind)) {
		return WAND_REVEALS[kind](before, after);
	}
	return !isRingKind(kind);
};
