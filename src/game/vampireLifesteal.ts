import { VAMPIRE_LIFESTEAL_PERCENT } from "./balance.js";
import type { GameEvent } from "./events.js";

/** The result of a vampire's self-heal roll — see enemies.ts's advanceEnemies. */
export interface VampireLifestealResult {
	readonly hp: number;
	/** undefined when the heal was zero (already at maxHp, or a floored-to-zero amount) — no event to log. */
	readonly event: GameEvent | undefined;
}

/**
 * A vampire heals VAMPIRE_LIFESTEAL_PERCENT (floored) of the damage it just
 * landed on the player, capped at `maxHp` — already-at-cap or a
 * rounds-to-zero heal both return the input `currentHp` unchanged and no
 * event. Pure: no rng involved, the amount is a deterministic function of
 * the damage dealt.
 */
export const resolveVampireLifesteal = (
	currentHp: number,
	maxHp: number,
	damageDealt: number,
): VampireLifestealResult => {
	const amount = Math.min(
		Math.floor((damageDealt * VAMPIRE_LIFESTEAL_PERCENT) / 100),
		maxHp - currentHp,
	);
	if (amount <= 0) {
		return { hp: currentHp, event: undefined };
	}
	return {
		hp: currentHp + amount,
		event: { type: "vampire-healed", payload: { amount } },
	};
};
