import { encodePointKey } from "../pointkey.js";
import type { Cell, TileGlyphs } from "../renderer/index.js";
import type { GameState } from "./state.js";
import { computeVisiblePoints } from "./vision.js";

// Tile set limited to emoji already verified stable on a real terminal
// (docs/tasks/modernization.md Stage 5).
const TERRAIN_GLYPHS: TileGlyphs = {
	0: { glyph: "🟫" },
	1: { glyph: "🧱" },
};
const FALLBACK_CELL: Cell = { glyph: "⚠️" };
const PLAYER_CELL: Cell = { glyph: "🧑" };

// Out-of-sight layers use the full-width space (U+3000, East Asian Width
// Wide — a stable 2 columns) instead of emoji: ANSI dimming has no effect on
// color emoji, so remembered terrain is drawn as background-color silhouettes
// and unexplored cells as plain darkness.
const UNEXPLORED_CELL: Cell = { glyph: "　" };
const REMEMBERED_WALL_CELL: Cell = { glyph: "　", bg: "#666666" };
const REMEMBERED_FLOOR_CELL: Cell = { glyph: "　", bg: "#262626" };

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
		return value === 1 ? REMEMBERED_WALL_CELL : REMEMBERED_FLOOR_CELL;
	}
	return UNEXPLORED_CELL;
};

/**
 * The complete frame for one state: three layers (visible terrain in emoji,
 * remembered terrain as silhouettes, unexplored darkness) with the player
 * drawn on top, ready for `<GameScreen>`. Pure — rendering effects stay in
 * the shell (`main.tsx`).
 */
export const buildFrameGrid = (state: GameState): Cell[][] => {
	const visiblePoints = computeVisiblePoints(state.terrain, state.player);

	const grid: Cell[][] = [];
	for (let y = 0; y < state.height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < state.width; x++) {
			row.push(toCell(state, visiblePoints, x, y));
		}
		grid.push(row);
	}

	const playerRow = grid[state.player.y];
	if (playerRow === undefined) {
		throw new Error("unreachable: player is always inside the terrain grid");
	}
	playerRow[state.player.x] = PLAYER_CELL;
	return grid;
};
