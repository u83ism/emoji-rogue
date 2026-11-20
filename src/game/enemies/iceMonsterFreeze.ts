import { createRng, type RngState } from "../../rng.js";
import {
	ICE_MONSTER_FREEZE_TURNS_MAX,
	ICE_MONSTER_FREEZE_TURNS_MIN,
	PARALYSIS_DEATH_TURNS,
} from "../balance.js";
import { rollToHit } from "../combat/damage.js";
import type { GameEvent } from "../events.js";

/** What one ice monster attack changes — see resolveIceMonsterAttack. */
export interface IceMonsterAttackResult {
	readonly paralyzedTurnsRemaining: number;
	readonly rng: RngState;
	readonly events: readonly GameEvent[];
	readonly died: boolean;
}

/**
 * An adjacent ice monster's attack, as in original Rogue's attack() case
 * 'I': it deals no damage, and a hit freezes the player for
 * ICE_MONSTER_FREEZE_TURNS_MIN..MAX more turns, on top of whatever
 * paralysis is already left — so being frozen again and again piles up, and
 * past PARALYSIS_DEATH_TURNS the player freezes to death. Only the hit that
 * starts a freeze is logged (player-frozen); a hit on an already frozen
 * player and a miss are silent, as in the original.
 */
export const resolveIceMonsterAttack = (
	paralyzedTurnsRemaining: number,
	hitChancePercent: number,
	rng: RngState,
): IceMonsterAttackResult => {
	const hitRoll = rollToHit(rng, hitChancePercent);
	if (!hitRoll.hit) {
		return {
			paralyzedTurnsRemaining,
			rng: hitRoll.rng,
			events: [],
			died: false,
		};
	}
	const source = createRng(1).setState(hitRoll.rng);
	const turns = source.getUniformInt(
		ICE_MONSTER_FREEZE_TURNS_MIN,
		ICE_MONSTER_FREEZE_TURNS_MAX,
	);
	const frozenTurns = paralyzedTurnsRemaining + turns;
	const events: GameEvent[] =
		paralyzedTurnsRemaining === 0
			? [{ type: "player-frozen", payload: { turns } }]
			: [];
	const died = frozenTurns > PARALYSIS_DEATH_TURNS;
	if (died) {
		events.push({ type: "player-died", payload: { by: "hypothermia" } });
	}
	return {
		paralyzedTurnsRemaining: frozenTurns,
		rng: source.getState(),
		events,
		died,
	};
};
