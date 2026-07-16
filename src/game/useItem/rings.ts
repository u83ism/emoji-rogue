import { buildEventLog } from "../events.js";
import type { GameState, InventoryEntry } from "../state.js";

/**
 * Equipping a ring sets its permanent on/off flag — not stackable, so a
 * second ring of the same kind is consumed but changes nothing. The effect
 * itself lives in the corresponding tick (regeneration.ts / hunger.ts).
 */
export const applyUseRing = (
	state: GameState,
	inventory: readonly InventoryEntry[],
	kind: "regeneration-ring" | "sustenance-ring",
): GameState => ({
	...state,
	...(kind === "regeneration-ring"
		? { hasRingOfRegeneration: true }
		: { hasRingOfSustenance: true }),
	inventory,
	events: buildEventLog(state.events, [
		{ type: "ring-equipped", payload: { kind } },
	]),
});
