import { createRng, type RngState, stepUniform } from "../../rng.js";
import { DAMAGE_VARIANCE_STDDEV } from "../balance.js";

export interface DamageRoll {
	readonly damage: number;
	readonly rng: RngState;
}

/** Original Rogue's dice notation: `count`x`sides` (a "2x4" mace is { count: 2, sides: 4 }). */
export interface DamageDice {
	readonly count: number;
	readonly sides: number;
}

export interface HitRoll {
	readonly hit: boolean;
	readonly rng: RngState;
}

/** A d100-style to-hit check: hits when the roll falls under `hitChancePercent`. */
export const rollToHit = (rng: RngState, hitChancePercent: number): HitRoll => {
	const roll = stepUniform(rng);
	return { hit: roll.value < hitChancePercent / 100, rng: roll.state };
};

/**
 * A discrete `dice.count`d`dice.sides` + `bonus` roll (original Rogue's
 * dice notation), floored at `minimum`. Each die consumes one uniform draw,
 * so the total rng consumption is exactly `dice.count` calls regardless of
 * the rolled values — unlike rollDamage's rejection-sampling normal
 * distribution, this fits the codebase's usual fixed-consumption-per-call
 * shape. A 0-count die rolls nothing and consumes nothing.
 */
export const rollDamageDice = (
	rng: RngState,
	dice: DamageDice,
	bonus: number,
	minimum: number,
): DamageRoll => {
	const source = createRng(1).setState(rng);
	let total = bonus;
	for (let dieIndex = 0; dieIndex < dice.count; dieIndex++) {
		total += source.getUniformInt(1, dice.sides);
	}
	return { damage: Math.max(minimum, total), rng: source.getState() };
};

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
