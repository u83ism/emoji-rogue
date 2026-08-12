import { encodePointKey } from "../pointkey.js";
import type { Cell } from "../renderer/index.js";
import { isAdjacent } from "./combat.js";
import { ENEMY_GLYPHS } from "./enemyGlyphs.js";
import {
	AMULET_CELL,
	DEAD_PLAYER_CELL,
	FALLBACK_CELL,
	GOLD_CELL,
	ITEM_GLYPHS,
	PLAYER_CELL,
	REMEMBERED_FLOOR_CELL,
	REMEMBERED_STAIRS_CELL,
	REMEMBERED_WALL_CELL,
	STAIRS_GLYPHS,
	TERRAIN_GLYPHS,
	UNEXPLORED_CELL,
	WON_PLAYER_CELL,
} from "./glyphs.js";
import { hasEquippedRing } from "./items/rings.js";
import type { Enemy, GameState, GameStatus } from "./state.js";
import { computeVisiblePoints, resolveViewRadius } from "./vision.js";

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
const resolveEnemyCell = (
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

const toCell = (
	state: GameState,
	visiblePoints: ReadonlySet<string>,
	x: number,
	y: number,
): Cell => {
	const value = state.terrain[x]?.[y];
	if (visiblePoints.has(encodePointKey(x, y))) {
		return (
			(value !== undefined ? TERRAIN_GLYPHS[value] : undefined) ?? FALLBACK_CELL
		);
	}
	if (state.explored[x]?.[y]) {
		if (x === state.stairs.x && y === state.stairs.y) {
			return REMEMBERED_STAIRS_CELL;
		}
		return value === 1 ? REMEMBERED_WALL_CELL : REMEMBERED_FLOOR_CELL;
	}
	return UNEXPLORED_CELL;
};

/** Which glyph stands on the player's own tile, by run outcome. */
const resolvePlayerCell = (status: GameStatus): Cell => {
	if (status === "dead") {
		return DEAD_PLAYER_CELL;
	}
	if (status === "won") {
		return WON_PLAYER_CELL;
	}
	return PLAYER_CELL;
};

/**
 * The complete frame for one state: three layers (visible terrain in emoji,
 * remembered terrain as silhouettes, unexplored darkness) with the player
 * drawn on top, ready for `<GameScreen>`. Pure — rendering effects stay in
 * the shell (`main.tsx`).
 */
export const buildFrameGrid = (state: GameState): Cell[][] => {
	const visiblePoints = computeVisiblePoints(
		state.terrain,
		state.player,
		resolveViewRadius(state),
	);

	const grid: Cell[][] = [];
	for (let y = 0; y < state.height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < state.width; x++) {
			row.push(toCell(state, visiblePoints, x, y));
		}
		grid.push(row);
	}

	/* overlay order = precedence, lowest first: gold < items < amulet < stairs < enemies < player */
	for (const pile of state.goldPiles) {
		if (!visiblePoints.has(encodePointKey(pile.x, pile.y))) {
			continue;
		}
		const goldRow = grid[pile.y];
		if (goldRow !== undefined) {
			goldRow[pile.x] = GOLD_CELL;
		}
	}

	for (const item of state.items) {
		if (!visiblePoints.has(encodePointKey(item.x, item.y))) {
			continue;
		}
		const itemRow = grid[item.y];
		if (itemRow !== undefined) {
			itemRow[item.x] = ITEM_GLYPHS[item.kind];
		}
	}

	if (
		state.amulet !== undefined &&
		visiblePoints.has(encodePointKey(state.amulet.x, state.amulet.y))
	) {
		const amuletRow = grid[state.amulet.y];
		if (amuletRow !== undefined) {
			amuletRow[state.amulet.x] = AMULET_CELL;
		}
	}

	/* the staircase shows while visible; enemies and the player draw over it */
	if (visiblePoints.has(encodePointKey(state.stairs.x, state.stairs.y))) {
		const stairsRow = grid[state.stairs.y];
		if (stairsRow !== undefined) {
			stairsRow[state.stairs.x] = STAIRS_GLYPHS[state.stairs.direction];
		}
	}

	/* enemies are drawn while visible, or unconditionally while detected
	 * (a timed potion effect or a permanently-equipped ring of awareness) —
	 * except a phantom, which plain FOV visibility never reveals: only
	 * detection or standing adjacent to it does. */
	const detectingMonsters =
		state.detectMonstersTurnsRemaining > 0 ||
		hasEquippedRing(state.inventory, "awareness-ring");
	const hallucinating = state.hallucinatingTurnsRemaining > 0;
	for (const enemy of state.enemies) {
		const isHiddenPhantom =
			enemy.kind === "phantom" &&
			!detectingMonsters &&
			!isAdjacent(enemy, state.player);
		if (isHiddenPhantom) {
			continue;
		}
		if (
			!detectingMonsters &&
			!visiblePoints.has(encodePointKey(enemy.x, enemy.y))
		) {
			continue;
		}
		const enemyRow = grid[enemy.y];
		if (enemyRow !== undefined) {
			enemyRow[enemy.x] = resolveEnemyCell(
				enemy,
				hallucinating,
				state.turnsOnCurrentFloor,
			);
		}
	}

	const playerRow = grid[state.player.y];
	if (playerRow === undefined) {
		throw new Error("unreachable: player is always inside the terrain grid");
	}
	playerRow[state.player.x] = resolvePlayerCell(state.status);
	return grid;
};
