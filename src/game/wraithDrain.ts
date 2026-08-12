import type { GameEvent } from "./events.js";

/** The result of a wraith's permanent playerMaxHp drain — see enemies.ts's advanceEnemies. */
export interface WraithDrainResult {
	readonly playerMaxHp: number;
	readonly playerHp: number;
	/** undefined when the drain was zero (already at the floor) — no event to log. */
	readonly event: GameEvent | undefined;
}

/**
 * A wraith's landed hit permanently lowers playerMaxHp by `amount`, floored
 * at 1 (never fully erasing the player's max HP). playerHp is clamped down
 * to the new max if it now exceeds it — already-at-the-floor returns both
 * inputs unchanged and no event. Pure: the amount is a fixed constant, no
 * rng involved.
 */
export const resolveWraithDrain = (
	playerMaxHp: number,
	playerHp: number,
	amount: number,
): WraithDrainResult => {
	const drained = Math.min(amount, playerMaxHp - 1);
	if (drained <= 0) {
		return { playerMaxHp, playerHp, event: undefined };
	}
	const nextMaxHp = playerMaxHp - drained;
	return {
		playerMaxHp: nextMaxHp,
		playerHp: Math.min(playerHp, nextMaxHp),
		event: { type: "player-drained", payload: { amount: drained } },
	};
};
