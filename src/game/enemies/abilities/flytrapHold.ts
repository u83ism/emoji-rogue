import type { RngState } from "../../../rng.js";
import { isAdjacent } from "../../combat/combat.js";
import { rollToHit } from "../../combat/damage.js";
import type { GameEvent } from "../../events.js";
import type { Enemy, Position } from "../../state.js";

/** What one turn of a venus-flytrap's hold changes — see resolveFlytrapAttack. */
export interface FlytrapAttackResult {
	readonly playerHp: number;
	readonly flytrapHoldDamage: number;
	readonly rng: RngState;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/**
 * An adjacent venus-flytrap's turn, as in original Rogue's attack(): the
 * hold tightens instead of rolling dice. A landed to-hit roll raises
 * `holdDamage` (the original's `vf_hit`) by one first; either way the
 * player then loses that much HP — so the first bite costs 1, the next 2,
 * and a miss still squeezes for whatever the hold has built up. A miss
 * before the first bite is an ordinary miss.
 */
export const resolveFlytrapAttack = (
	holdDamage: number,
	playerHp: number,
	hitChancePercent: number,
	rng: RngState,
): FlytrapAttackResult => {
	const hitRoll = rollToHit(rng, hitChancePercent);
	const flytrapHoldDamage = hitRoll.hit ? holdDamage + 1 : holdDamage;
	if (flytrapHoldDamage === 0) {
		return {
			playerHp,
			flytrapHoldDamage,
			rng: hitRoll.rng,
			events: [
				{ type: "enemy-attack-missed", payload: { by: "venus-flytrap" } },
			],
			died: false,
		};
	}
	const nextPlayerHp = playerHp - flytrapHoldDamage;
	const died = nextPlayerHp <= 0;
	const hitEvent: GameEvent = {
		type: "player-hit",
		payload: { by: "venus-flytrap", damage: flytrapHoldDamage },
	};
	return {
		playerHp: nextPlayerHp,
		flytrapHoldDamage,
		rng: hitRoll.rng,
		events: died
			? [hitEvent, { type: "player-died", payload: { by: "venus-flytrap" } }]
			: [hitEvent],
		died,
	};
};

/** Whether any awake venus-flytrap among `enemies` is next to `player` — the hold lasts exactly as long as one is. */
export const isHeldByFlytrap = (
	enemies: readonly Enemy[],
	player: Position,
): boolean =>
	enemies.some(
		(enemy) =>
			enemy.kind === "venus-flytrap" &&
			enemy.awake &&
			isAdjacent(enemy, player),
	);
