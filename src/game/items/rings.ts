import { applyStrengthChange } from "../combat/strength.js";
import { buildEventLog, type GameEvent, type RingKind } from "../events.js";
import type { GameState, HeldItem } from "../state.js";
import { replaceHeldItem } from "./inventory.js";

type RingItem = Extract<HeldItem, { kind: RingKind }>;

/** One ring per hand — original Rogue's cur_ring[LEFT] and cur_ring[RIGHT]. */
const MAX_WORN_RINGS = 2;

const isWornRing = (item: HeldItem): item is RingItem =>
	"equipped" in item &&
	item.equipped &&
	item.kind !== "weapon" &&
	item.kind !== "armor";

/** The rings being worn, in pack order — the first stands for the left hand, whose effects original Rogue checks first. */
export const findWornRings = (
	inventory: readonly HeldItem[],
): readonly RingItem[] => inventory.filter(isWornRing);

/** Whether a ring of `kind` is worn on either hand (original Rogue's ISWEARING). */
export const hasEquippedRing = (
	inventory: readonly HeldItem[],
	kind: RingKind,
): boolean => findWornRings(inventory).some((ring) => ring.kind === kind);

const withEvents = (state: GameState, events: readonly GameEvent[]) => ({
	...state,
	events: buildEventLog(state.events, events),
});

/**
 * Taking off a worn ring — refused while it is cursed (same lock as
 * weapons/armor). An add strength ring takes its value back off strength
 * once it is off the hand (original Rogue's chg_str(-o_arm)).
 */
const applyRingRemoval = (state: GameState, item: RingItem): GameState => {
	if (item.cursed) {
		return withEvents(state, [
			{ type: "equip-blocked-cursed", payload: { kind: item.kind } },
		]);
	}
	const removed = {
		...state,
		inventory: replaceHeldItem(state.inventory, item.itemId, {
			...item,
			equipped: false,
		}),
	};
	const restored =
		item.kind === "add-strength-ring" && "bonus" in item
			? applyStrengthChange(removed, -item.bonus)
			: removed;
	return withEvents(restored, [
		{ type: "item-unequipped", payload: { kind: item.kind } },
	]);
};

/**
 * Toggles a held ring on or off a hand, as original Rogue's ring_on()/
 * ring_off(): it goes on whichever hand is free — refused once both are
 * taken (rings-hands-full) — and comes off with the same curse lock as
 * weapons/armor. Putting one on reveals a curse, an add strength ring adds
 * its value to strength (chg_str), and a ring of aggravate monster wakes
 * every enemy on the floor at once. Every other ring's effect is a
 * continuous passive read elsewhere (hasEquippedRing, equipmentStats.ts).
 */
export const applyToggleRingEquip = (
	state: GameState,
	item: RingItem,
): GameState => {
	if (item.equipped) {
		return applyRingRemoval(state, item);
	}
	if (findWornRings(state.inventory).length >= MAX_WORN_RINGS) {
		return withEvents(state, [{ type: "ring-hands-full", payload: {} }]);
	}
	const worn = {
		...state,
		inventory: replaceHeldItem(state.inventory, item.itemId, {
			...item,
			equipped: true,
		}),
	};
	const strengthened =
		item.kind === "add-strength-ring" && "bonus" in item
			? applyStrengthChange(worn, item.bonus)
			: worn;
	const events: GameEvent[] = [
		{ type: "ring-equipped", payload: { kind: item.kind } },
	];
	if (item.cursed) {
		events.push({ type: "curse-revealed", payload: { kind: item.kind } });
	}
	const next = withEvents(strengthened, events);
	return item.kind === "aggravate-monster-ring"
		? {
				...next,
				enemies: next.enemies.map((enemy) => ({ ...enemy, awake: true })),
			}
		: next;
};
