import { buildEventLog, type GameEvent } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { unequipOthers } from "./equipment.js";
import { replaceHeldItem } from "./inventory.js";

type RingItem = Extract<
	HeldItem,
	{
		kind:
			| "regeneration-ring"
			| "sustenance-ring"
			| "stealth-ring"
			| "awareness-ring";
	}
>;

const RING_KINDS = [
	"regeneration-ring",
	"sustenance-ring",
	"stealth-ring",
	"awareness-ring",
] as const;

/** Whether a ring of `kind` is currently equipped — regeneration.ts/hunger.ts's turn-end ticks, enemies.ts's wake check, and frame.ts's detection check read this instead of a permanent flag. */
export const hasEquippedRing = (
	inventory: readonly HeldItem[],
	kind:
		| "regeneration-ring"
		| "sustenance-ring"
		| "stealth-ring"
		| "awareness-ring",
): boolean =>
	inventory.some(
		(item) => item.kind === kind && "equipped" in item && item.equipped,
	);

/**
 * Toggles a held ring's equip state. Only one ring can be equipped at a
 * time (regardless of regeneration/sustenance kind) — equipping unequips
 * whichever ring, of either kind, was equipped before. Same curse-reveal
 * and cursed-lock rules as swords/armor.
 */
export const applyToggleRingEquip = (
	state: GameState,
	item: RingItem,
): GameState => {
	if (item.equipped) {
		if (item.cursed) {
			return {
				...state,
				events: buildEventLog(state.events, [
					{ type: "equip-blocked-cursed", payload: { kind: item.kind } },
				]),
			};
		}
		return {
			...state,
			inventory: replaceHeldItem(state.inventory, item.itemId, {
				...item,
				equipped: false,
			}),
			events: buildEventLog(state.events, [
				{ type: "item-unequipped", payload: { kind: item.kind } },
			]),
		};
	}
	const inventory = replaceHeldItem(
		unequipOthers(state.inventory, item.itemId, RING_KINDS),
		item.itemId,
		{ ...item, equipped: true },
	);
	const events: GameEvent[] = [
		{ type: "ring-equipped", payload: { kind: item.kind } },
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: item.kind } });
	}
	return { ...state, inventory, events: buildEventLog(state.events, events) };
};
