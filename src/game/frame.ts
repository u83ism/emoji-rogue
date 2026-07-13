import type { Cell, TileGlyphs } from "../renderer/index.js";
import { gridFrom } from "../renderer/index.js";
import type { GameState } from "./state.js";

// Milestone-1 tile set, limited to emoji already verified stable on a real
// terminal (docs/tasks/modernization.md Stage 5).
const TERRAIN_GLYPHS: TileGlyphs = {
	0: { glyph: "🟫" },
	1: { glyph: "🧱" },
};
const FALLBACK_CELL: Cell = { glyph: "⚠️" };
const PLAYER_CELL: Cell = { glyph: "🧑" };

/**
 * The complete frame for one state: the terrain grid with the player drawn
 * on top, ready for `<GameScreen>`. Pure — rendering effects stay in the
 * shell (`main.tsx`).
 */
export const buildFrameGrid = (state: GameState): Cell[][] => {
	const grid = gridFrom(state.terrain, TERRAIN_GLYPHS, FALLBACK_CELL);
	const playerRow = grid[state.player.y];
	if (playerRow === undefined) {
		throw new Error("unreachable: player is always inside the terrain grid");
	}
	playerRow[state.player.x] = PLAYER_CELL;
	return grid;
};
