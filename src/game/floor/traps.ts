import type { Rng } from "../../rng.js";
import {
	BEAR_TRAP_SPAWN_CHANCE_PERCENT,
	GOAL_FLOOR,
	TELEPORT_TRAP_SPAWN_CHANCE_PERCENT,
	TRAP_COUNT_PER_FLOOR,
	TRAPDOOR_SPAWN_CHANCE_PERCENT,
} from "../balance.js";
import type { Position, Trap } from "../state.js";
import { drawSpawnTileWhere } from "./spawnPool.js";

/**
 * Every trap on a fresh floor, drawn from (and removed from) `remaining` by
 * consuming `rng`: TRAP_COUNT_PER_FLOOR dart traps guaranteed, then the
 * chance-rolled trapdoor (never on GOAL_FLOOR — it would generate a floor
 * beyond it) and teleport trap (allowed on GOAL_FLOOR — it only relocates the
 * player within the floor). Split out of floor/items.ts's drawFloorItems
 * (milestone 85 follow-up) once that file passed the 200-line structure-lint
 * limit; rng consumption order is unchanged (this ran last inside
 * drawFloorItems already).
 *
 * Traps only land on tiles satisfying `isTrapTileEligible` (room interiors
 * away from doorways — see layout.ts): an invisible trap on a corridor or
 * doorway tile would be unavoidable. A trap whose draw finds no eligible tile
 * is skipped, never relocated onto an ineligible one.
 */
export const drawFloorTraps = (
	remaining: Position[],
	rng: Rng,
	floor: number,
	isTrapTileEligible: (position: Position) => boolean,
): readonly Trap[] => {
	const traps: Trap[] = [];
	for (let i = 0; i < TRAP_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		const tile = drawSpawnTileWhere(remaining, rng, isTrapTileEligible);
		if (tile === undefined) {
			break;
		}
		traps.push({ ...tile, kind: "dart" });
	}
	if (
		floor !== GOAL_FLOOR &&
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TRAPDOOR_SPAWN_CHANCE_PERCENT
	) {
		const tile = drawSpawnTileWhere(remaining, rng, isTrapTileEligible);
		if (tile !== undefined) {
			traps.push({ ...tile, kind: "trapdoor" });
		}
	}
	if (
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TELEPORT_TRAP_SPAWN_CHANCE_PERCENT
	) {
		const tile = drawSpawnTileWhere(remaining, rng, isTrapTileEligible);
		if (tile !== undefined) {
			traps.push({ ...tile, kind: "teleport" });
		}
	}
	if (
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < BEAR_TRAP_SPAWN_CHANCE_PERCENT
	) {
		const tile = drawSpawnTileWhere(remaining, rng, isTrapTileEligible);
		if (tile !== undefined) {
			traps.push({ ...tile, kind: "bear" });
		}
	}
	return traps;
};
