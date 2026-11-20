import type { Cell } from "../renderer/index.js";
import { ENEMY_GLYPHS } from "./enemyGlyphs.js";
import { GOLD_CELL } from "./glyphs.js";
import type { Enemy } from "./state.js";

// How one enemy looks on the map — its glyph, a xeroc's disguise, a
// hallucination's decoy — split out of frame.ts once the traps of
// milestone 119 pushed that file past the 200-line structure-lint limit.

/** Fixed iteration order (object literal insertion order) — deterministic across calls. */
const ENEMY_GLYPH_VALUES: readonly Cell[] = Object.values(ENEMY_GLYPHS);

/**
 * The decoy glyph shown for `enemy` while hallucinating: a deterministic
 * pseudo-random pick from ENEMY_GLYPH_VALUES, derived from the enemy's
 * position and turnsOnCurrentFloor rather than Math.random() — buildFrameGrid
 * must stay a pure function of state, so "looks different each render" comes
 * from turnsOnCurrentFloor changing every turn, not from actual randomness.
 * Real kind/hp/behavior are untouched; this only ever affects what gets drawn.
 */
const resolveHallucinatedGlyph = (
	enemy: Enemy,
	turnsOnCurrentFloor: number,
): Cell => {
	const index =
		(enemy.x * 7 + enemy.y * 13 + turnsOnCurrentFloor) %
		ENEMY_GLYPH_VALUES.length;
	const glyph = ENEMY_GLYPH_VALUES[index];
	if (glyph === undefined) {
		throw new Error(
			"unreachable: index is derived modulo ENEMY_GLYPH_VALUES.length",
		);
	}
	return glyph;
};

/** A still-asleep xeroc draws as GOLD_CELL (outranking hallucination, which would otherwise give the disguise away) — otherwise the hallucinated decoy or the real glyph. */
export const resolveEnemyCell = (
	enemy: Enemy,
	hallucinating: boolean,
	turnsOnCurrentFloor: number,
): Cell => {
	if (enemy.kind === "xeroc" && !enemy.awake) {
		return GOLD_CELL;
	}
	return hallucinating
		? resolveHallucinatedGlyph(enemy, turnsOnCurrentFloor)
		: ENEMY_GLYPHS[enemy.kind];
};
