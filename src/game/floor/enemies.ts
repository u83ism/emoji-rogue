import { at } from "../../indexing.js";
import type { Rng } from "../../rng.js";
import { calculateEnemyLevelBonus, HASTED_ENEMY_FLOOR } from "../balance.js";
import {
	ENEMY_DEPTH_ORDER,
	ENEMY_HP_DICE_SIDES,
	ENEMY_STATS,
	NON_WANDERING_ENEMY_KINDS,
} from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, Position } from "../state.js";

/** How far below (and, minus one, above) its own floor's entry of ENEMY_DEPTH_ORDER a floor can draw — original Rogue's `level + (rnd(10) - 6)`. */
const DEPTH_WINDOW_SIZE = 10;
const DEPTH_WINDOW_OFFSET = 6;
/** A draw that falls off either end of ENEMY_DEPTH_ORDER is redrawn among this many entries at that end. */
const DEPTH_EDGE_SIZE = 5;

/**
 * Which kind spawns on `floor` — original Rogue's randmonster(): an index
 * into ENEMY_DEPTH_ORDER drawn from the 10-entry window floor-6..floor+3,
 * so each floor deeper retires the weakest candidate and admits a stronger
 * one. Off the front of the list it redraws among the first five kinds, off
 * the back among the last five. Consumes `rng` once, or twice on a redraw.
 */
const drawEnemyKindOnce = (rng: Rng, floor: number): EnemyKind => {
	const drawn =
		floor + rng.getUniformInt(0, DEPTH_WINDOW_SIZE - 1) - DEPTH_WINDOW_OFFSET;
	if (drawn < 0) {
		return at(ENEMY_DEPTH_ORDER, rng.getUniformInt(0, DEPTH_EDGE_SIZE - 1));
	}
	if (drawn >= ENEMY_DEPTH_ORDER.length) {
		return at(
			ENEMY_DEPTH_ORDER,
			ENEMY_DEPTH_ORDER.length -
				DEPTH_EDGE_SIZE +
				rng.getUniformInt(0, DEPTH_EDGE_SIZE - 1),
		);
	}
	return at(ENEMY_DEPTH_ORDER, drawn);
};

/**
 * The kind of one new enemy on `floor`. A "resident" (placed at floor
 * generation) is whatever drawEnemyKindOnce draws; a "wanderer" (arriving
 * later, see turnEnd/wanderer.ts) redraws until the kind is one that
 * wanders, as original Rogue's randmonster(true) does.
 */
export const drawEnemyKindForFloor = (
	rng: Rng,
	floor: number,
	origin: "resident" | "wanderer" = "resident",
): EnemyKind => {
	for (;;) {
		const kind = drawEnemyKindOnce(rng, floor);
		if (origin === "resident" || !NON_WANDERING_ENEMY_KINDS.includes(kind)) {
			return kind;
		}
	}
};

/**
 * The first and last floor `kind` can spawn on — the floors whose window in
 * drawEnemyKindForFloor reaches its entry. `lastFloor` is undefined for the
 * last DEPTH_EDGE_SIZE kinds: a window past the end of ENEMY_DEPTH_ORDER
 * redraws among them, so they keep coming on every floor below.
 */
export const calculateEnemyFloorRange = (
	kind: EnemyKind,
): { readonly firstFloor: number; readonly lastFloor: number | undefined } => {
	const index = ENEMY_DEPTH_ORDER.indexOf(kind);
	return {
		firstFloor: Math.max(
			1,
			index - (DEPTH_WINDOW_SIZE - 1 - DEPTH_WINDOW_OFFSET),
		),
		lastFloor:
			index >= ENEMY_DEPTH_ORDER.length - DEPTH_EDGE_SIZE
				? undefined
				: index + DEPTH_WINDOW_OFFSET,
	};
};

/**
 * A fresh, sleeping `kind` born on `floor` at `position`, as original
 * Rogue's new_monster(): its HP rolled as level d8 — the level boosted by
 * calculateEnemyLevelBonus on deep floors — and hasted from
 * HASTED_ENEMY_FLOOR down.
 */
export const buildSpawnedEnemy = (
	kind: EnemyKind,
	position: Position,
	rng: Rng,
	floor = 1,
): Enemy => {
	let maxHp = 0;
	const level = ENEMY_STATS[kind].level + calculateEnemyLevelBonus(floor);
	for (let dieIndex = 0; dieIndex < level; dieIndex++) {
		maxHp += rng.getUniformInt(1, ENEMY_HP_DICE_SIDES);
	}
	return {
		...position,
		kind,
		hp: maxHp,
		maxHp,
		awake: false,
		speed: floor >= HASTED_ENEMY_FLOOR ? "hasted" : "normal",
		held: false,
		carried: [],
		confusedTurnsRemaining: 0,
	};
};
