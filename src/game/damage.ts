import { createRng, type RngState, stepUniform } from "../rng.js";
import { DAMAGE_VARIANCE_STDDEV } from "./balance.js";

export interface DamageRoll {
	readonly damage: number;
	readonly rng: RngState;
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

/** The mean of a single `diceSides`-sided die — the amount a "1d`diceSides`+bonus" roll centers on. */
export const damageDiceMean = (diceSides: number): number =>
	Math.round((diceSides + 1) / 2);

/**
 * A discrete `diceCount`d`diceSides` + `bonus` roll (original Rogue's dice
 * notation), floored at `minimum`. Each die consumes one uniform draw, so
 * the total rng consumption is exactly `diceCount` calls regardless of the
 * rolled values — unlike rollDamage's rejection-sampling normal
 * distribution, this fits the codebase's usual fixed-consumption-per-call
 * shape.
 */
export const rollDamageDice = (
	rng: RngState,
	diceCount: number,
	diceSides: number,
	bonus: number,
	minimum: number,
): DamageRoll => {
	const source = createRng(1).setState(rng);
	let total = bonus;
	for (let dieIndex = 0; dieIndex < diceCount; dieIndex++) {
		total += source.getUniformInt(1, diceSides);
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
