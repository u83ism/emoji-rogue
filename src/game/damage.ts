import { createRng, type RngState } from "../rng.js";
import { DAMAGE_VARIANCE_STDDEV } from "./balance.js";

export interface DamageRoll {
	readonly damage: number;
	readonly rng: RngState;
}

/**
 * A damage roll around `mean`, normally (not uniformly) distributed, rounded
 * to the nearest integer and clipped to `minimum`. Normal sampling
 * (`Rng.getNormal`, a Box-Muller implementation inherited from rot.js and
 * left untouched) uses rejection sampling internally, so it consumes a
 * variable number of uniform draws — that doesn't fit the pure
 * `stepUniform(state) => {value, state}` step shape used elsewhere in the
 * game core. Instead this wraps the plain `RngState` in a transient,
 * stateful `Rng` for the one call, then reads `.getState()` back out — the
 * same pattern `floor.ts`'s `descendStairs` already uses.
 */
export const rollDamage = (
	rng: RngState,
	mean: number,
	minimum: number,
): DamageRoll => {
	const source = createRng(1).setState(rng);
	const rawDamage = source.getNormal(mean, DAMAGE_VARIANCE_STDDEV);
	return {
		damage: Math.max(minimum, Math.round(rawDamage)),
		rng: source.getState(),
	};
};
