import { GRIFFIN_REGEN_AMOUNT, TROLL_REGEN_AMOUNT } from "./balance.js";
import type { EnemyKind, GameEvent } from "./events.js";

/** The result of a griffin/troll's passive per-turn self-heal — see enemies.ts's advanceEnemies. */
export interface EnemyRegenResult {
	readonly hp: number;
	/** undefined when the kind doesn't regenerate, or the heal was zero (already at maxHp) — no event to log. */
	readonly event: GameEvent | undefined;
}

/** How much HP `kind` regenerates per awake turn — undefined for every kind but griffin/troll. */
const REGEN_AMOUNT: Readonly<Partial<Record<EnemyKind, number>>> = {
	griffin: GRIFFIN_REGEN_AMOUNT,
	troll: TROLL_REGEN_AMOUNT,
};

/**
 * A griffin/troll heals its own REGEN_AMOUNT of HP this turn, capped at
 * `maxHp` — every other kind, or an already-at-cap griffin/troll, returns
 * `currentHp` unchanged and no event. Pure and unconditional: no rng
 * involved and no damage-dealt input, unlike vampireLifesteal.ts's on-hit
 * heal — this ticks every awake turn regardless of whether the enemy landed
 * an attack.
 */
export const resolveEnemyRegen = (
	kind: EnemyKind,
	currentHp: number,
	maxHp: number,
): EnemyRegenResult => {
	const amount = REGEN_AMOUNT[kind];
	if (amount === undefined) {
		return { hp: currentHp, event: undefined };
	}
	const healed = Math.min(amount, maxHp - currentHp);
	if (healed <= 0) {
		return { hp: currentHp, event: undefined };
	}
	return {
		hp: currentHp + healed,
		event: {
			type: "enemy-regenerated",
			payload: { target: kind, amount: healed },
		},
	};
};
