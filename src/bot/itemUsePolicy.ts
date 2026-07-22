import { PLAYER_HUNGER_WARNING_THRESHOLD } from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import type { GameState, HeldItem } from "../game/state.js";
import {
	decideArmorToEquip,
	decideRingToEquip,
	decideSwordToEquip,
} from "./equipmentPolicy.js";

/** What to send as the "use-item" action's payload this turn. */
export interface ItemUseDecision {
	readonly itemId: number;
	readonly targetItemId?: number;
}

/**
 * Item kinds this bot drinks/reads the moment it holds one, in no particular
 * priority among themselves — every one of these is pure permanent upside
 * with no downside worth waiting for, unlike the potions this list
 * deliberately omits (poison, confusion, blindness, paralysis, hallucination)
 * which the bot never drinks proactively. The core state always carries the
 * real kind (identification only affects shell display text), so there is no
 * guessing involved.
 */
const PERMANENT_UPSIDE_POTION_KINDS: readonly ItemKind[] = [
	"life",
	"raise-level",
	"strength",
];

const findHeld = (
	state: GameState,
	kind: ItemKind,
	disabledKinds: ReadonlySet<ItemKind>,
): HeldItem | undefined =>
	disabledKinds.has(kind)
		? undefined
		: state.inventory.find((item) => item.kind === kind);

const hasCursedEquipped = (state: GameState): boolean =>
	state.inventory.some(
		(item) => "equipped" in item && item.equipped && item.cursed,
	);

/**
 * A targeted scroll's decision: use it against `isEligible`'s best match
 * (equipped preferred, else the first held one), or hold onto it (undefined)
 * with nothing eligible to target — using it with no target would be a
 * free, state-unchanged no-op (see items/use.ts), which would otherwise get
 * re-picked every single turn forever instead of ever moving.
 */
const decideTargetedScrollUse = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind>,
	scrollKind: ItemKind,
	isEligible: (item: HeldItem) => boolean,
): ItemUseDecision | undefined => {
	const scroll = findHeld(state, scrollKind, disabledKinds);
	if (scroll === undefined) {
		return undefined;
	}
	const eligible = state.inventory.filter(isEligible);
	const target =
		eligible.find((item) => "equipped" in item && item.equipped) ??
		eligible.at(0);
	if (target === undefined) {
		return undefined;
	}
	return { itemId: scroll.itemId, targetItemId: target.itemId };
};

/**
 * Which held item (if any) the bot should use this turn, highest priority
 * first: a magic mapping scroll as soon as it is picked up (the biggest
 * single boost to exploration speed available), healing once hurt to half
 * HP or worse, food once hunger crosses the warning threshold, freeing a
 * cursed equipped item, the targeted enchant/protect scrolls (only when
 * there is something eligible to target), equipping the best available
 * sword/armor/ring (see equipmentPolicy.ts), then any one-shot
 * permanent-upside potion just sitting unused. Undefined means move instead.
 */
export const decideItemToUse = (
	state: GameState,
	disabledKinds: ReadonlySet<ItemKind> = new Set(),
): ItemUseDecision | undefined => {
	const mappingScroll = findHeld(state, "mapping-scroll", disabledKinds);
	if (mappingScroll !== undefined) {
		return { itemId: mappingScroll.itemId };
	}

	const healPotion = findHeld(state, "heal-potion", disabledKinds);
	if (state.playerHp * 2 <= state.playerMaxHp && healPotion !== undefined) {
		return { itemId: healPotion.itemId };
	}

	const food = findHeld(state, "food", disabledKinds);
	if (
		state.playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD &&
		food !== undefined
	) {
		return { itemId: food.itemId };
	}

	const removeCurseScroll = findHeld(
		state,
		"remove-curse-scroll",
		disabledKinds,
	);
	if (removeCurseScroll !== undefined && hasCursedEquipped(state)) {
		return { itemId: removeCurseScroll.itemId };
	}

	const enchantWeapon = decideTargetedScrollUse(
		state,
		disabledKinds,
		"enchant-weapon",
		(item) => item.kind === "sword",
	);
	if (enchantWeapon !== undefined) {
		return enchantWeapon;
	}

	const enchantArmor = decideTargetedScrollUse(
		state,
		disabledKinds,
		"enchant-armor",
		(item) => item.kind === "armor",
	);
	if (enchantArmor !== undefined) {
		return enchantArmor;
	}

	const protectArmor = decideTargetedScrollUse(
		state,
		disabledKinds,
		"protect-armor",
		(item) => item.kind === "armor" && !item.rustProtected,
	);
	if (protectArmor !== undefined) {
		return protectArmor;
	}

	const swordToEquip = decideSwordToEquip(state, disabledKinds);
	if (swordToEquip !== undefined) {
		return { itemId: swordToEquip };
	}

	const armorToEquip = decideArmorToEquip(state, disabledKinds);
	if (armorToEquip !== undefined) {
		return { itemId: armorToEquip };
	}

	const ringToEquip = decideRingToEquip(state, disabledKinds);
	if (ringToEquip !== undefined) {
		return { itemId: ringToEquip };
	}

	for (const kind of PERMANENT_UPSIDE_POTION_KINDS) {
		const held = findHeld(state, kind, disabledKinds);
		if (held !== undefined) {
			return { itemId: held.itemId };
		}
	}

	return undefined;
};
