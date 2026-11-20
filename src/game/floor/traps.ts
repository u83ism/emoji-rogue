import type { Rng } from "../../rng.js";
import { MAX_TRAPS_PER_FLOOR } from "../balance.js";
import { TRAP_KIND_VALUES } from "../events.js";
import type { Position, Trap } from "../state.js";
import { drawSpawnTileWhere } from "./spawnPool.js";

/**
 * Every trap on a fresh floor, drawn from (and removed from) `remaining` by
 * consuming `rng`, as original Rogue's new_level(): on floor N there is an
 * N-in-10 chance of any traps at all (`rnd(10) < level`), and then
 * `rnd(level / 4) + 1` of them, at most MAX_TRAPS_PER_FLOOR, each of the
 * eight kinds as likely as any other. Every trap starts hidden.
 *
 * Traps only land on tiles satisfying `isTrapTileEligible` (room interiors
 * away from doorways — see layout.ts): a hidden trap on a corridor or
 * doorway tile would be unavoidable. A trap whose draw finds no eligible
 * tile is skipped, never relocated onto an ineligible one.
 */
export const drawFloorTraps = (
	remaining: Position[],
	rng: Rng,
	floor: number,
	isTrapTileEligible: (position: Position) => boolean,
): readonly Trap[] => {
	if (rng.getUniformInt(0, 9) >= floor) {
		return [];
	}
	const quarter = Math.floor(floor / 4);
	const count = Math.min(
		MAX_TRAPS_PER_FLOOR,
		(quarter > 0 ? rng.getUniformInt(0, quarter - 1) : 0) + 1,
	);
	const traps: Trap[] = [];
	for (let i = 0; i < count && remaining.length > 0; i++) {
		const kind =
			TRAP_KIND_VALUES[rng.getUniformInt(0, TRAP_KIND_VALUES.length - 1)];
		const tile = drawSpawnTileWhere(remaining, rng, isTrapTileEligible);
		if (kind === undefined || tile === undefined) {
			continue;
		}
		traps.push({ ...tile, kind, seen: false });
	}
	return traps;
};
