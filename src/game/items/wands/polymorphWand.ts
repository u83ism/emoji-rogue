import { createRng } from "../../../rng.js";
import { buildEventLog, ENEMY_KIND_VALUES } from "../../events.js";
import { buildSpawnedEnemy } from "../../floor/enemies.js";
import type { Direction, GameState } from "../../state.js";
import { traceFlight } from "../../throw.js";
import { canSeeEnemy } from "../../vision.js";
import { hasEquippedRing } from "../rings/rings.js";

/**
 * A wand of polymorph, as original Rogue's do_zap() (WS_POLYMORPH): the
 * monster its bolt meets becomes a new one of any of the 26 kinds, rolled
 * afresh for this floor (new_monster() — asleep, unless the player wears a
 * ring of aggravate monster), keeping only its place and its pack. Seeing
 * the change (enemy-polymorphed) names the wand.
 */
export const applyUsePolymorphWand = (
	state: GameState,
	direction: Direction | undefined,
): GameState => {
	if (direction === undefined) {
		return state;
	}
	const { target } = traceFlight(state, direction);
	if (target === undefined) {
		return { ...state };
	}
	const rng = createRng(1).setState(state.rng);
	const kind =
		ENEMY_KIND_VALUES[rng.getUniformInt(0, ENEMY_KIND_VALUES.length - 1)] ??
		target.kind;
	const reborn = {
		...buildSpawnedEnemy(kind, target, rng, state.floor),
		carried: target.carried,
		awake: hasEquippedRing(state.inventory, "aggravate-monster-ring"),
	};
	const next = {
		...state,
		rng: rng.getState(),
		enemies: state.enemies.map((enemy) => (enemy === target ? reborn : enemy)),
	};
	return canSeeEnemy(next, reborn)
		? {
				...next,
				events: buildEventLog(next.events, [
					{ type: "enemy-polymorphed", payload: { target: kind } },
				]),
			}
		: next;
};
