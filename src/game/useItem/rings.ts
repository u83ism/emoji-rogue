import { buildEventLog } from "../events.js";
import type { GameState } from "../state.js";

/**
 * Equipping a ring sets its permanent on/off flag — not stackable, so a
 * second ring of the same kind is consumed but changes nothing. The effect
 * itself lives in the corresponding tick (regeneration.ts / hunger.ts).
 * Consumption from inventory happens in the dispatcher (useItem/index.ts).
 */
export const applyUseRing = (
	state: GameState,
	kind: "regeneration-ring" | "sustenance-ring",
): GameState => ({
	...state,
	...(kind === "regeneration-ring"
		? { hasRingOfRegeneration: true }
		: { hasRingOfSustenance: true }),
	events: buildEventLog(state.events, [
		{ type: "ring-equipped", payload: { kind } },
	]),
});
