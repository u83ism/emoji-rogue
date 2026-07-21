import { PLAYER_HUNGER_WARNING_THRESHOLD } from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import type { GameState } from "../game/state.js";

/**
 * Item kinds this bot uses the moment it holds one, in no particular
 * priority among themselves — every one of these is pure permanent upside
 * (a stat bonus, a ring flag, rust protection) with no downside worth
 * waiting for, unlike the potions this list deliberately omits (poison,
 * confusion, blindness, paralysis) which the bot never drinks proactively.
 * The core state always carries the real kind (identification only affects
 * shell display text), so there is no guessing involved.
 */
const PERMANENT_UPSIDE_KINDS: readonly ItemKind[] = [
	"life",
	"raise-level",
	"strength",
	"enchant-weapon",
	"enchant-armor",
	"protect-armor",
	"sword",
	"shield",
	"regeneration-ring",
	"sustenance-ring",
];

const holds = (state: GameState, kind: ItemKind): boolean =>
	state.inventory.some((entry) => entry.kind === kind);

/**
 * Which held item (if any) the bot should use this turn, highest priority
 * first: a magic mapping scroll as soon as it is picked up (the biggest
 * single boost to exploration speed available), healing once hurt to half
 * HP or worse, food once hunger crosses the warning threshold, then any
 * permanent-upside item just sitting unused. Undefined means move instead.
 */
export const decideItemToUse = (state: GameState): ItemKind | undefined => {
	if (holds(state, "mapping-scroll")) {
		return "mapping-scroll";
	}
	if (state.playerHp * 2 <= state.playerMaxHp && holds(state, "heal-potion")) {
		return "heal-potion";
	}
	if (
		state.playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD &&
		holds(state, "food")
	) {
		return "food";
	}
	return PERMANENT_UPSIDE_KINDS.find((kind) => holds(state, kind));
};
