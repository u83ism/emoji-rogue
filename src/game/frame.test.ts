import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildFrameGrid } from "./frame.js";
import { buildArenaGameState } from "./initialState.js";

describe("buildFrameGrid", () => {
	const state = buildArenaGameState(5, 4, 1);
	const grid = buildFrameGrid(state);

	it("produces a row-major grid of the map's dimensions", () => {
		expect(grid.length).toBe(4);
		for (const row of grid) {
			expect(row.length).toBe(5);
		}
	});

	it("draws walls, floors, and the player with their glyphs", () => {
		expect(grid[0]?.[0]?.glyph).toBe("🧱");
		expect(grid[1]?.[1]?.glyph).toBe("🟫");
		expect(grid[state.player.y]?.[state.player.x]?.glyph).toBe("🧑");
	});

	it("follows the player as the state advances", () => {
		const moved = advanceTurn(state, {
			type: "move",
			payload: { direction: "west" },
		});
		const nextGrid = buildFrameGrid(moved);
		expect(nextGrid[moved.player.y]?.[moved.player.x]?.glyph).toBe("🧑");
		expect(nextGrid[state.player.y]?.[state.player.x]?.glyph).toBe("🟫");
	});

	it("renders the three vision layers", () => {
		/* 30x5 arena: player starts at (15,2); view radius is 8 */
		const wide = buildArenaGameState(30, 5, 1);
		const west = { type: "move", payload: { direction: "west" } } as const;
		const moved = advanceTurn(advanceTurn(wide, west), west); /* (13,2) */
		const layered = buildFrameGrid(moved);

		/* visible layer: emoji */
		expect(layered[2]?.[12]?.glyph).toBe("🟫");
		expect(layered[2]?.[13]?.glyph).toBe("🧑");
		/* remembered layer: silhouettes (seen from (15,2), now out of range) */
		expect(layered[2]?.[23]).toEqual({ glyph: "　", bg: "#262626" });
		expect(layered[0]?.[23]).toEqual({ glyph: "　", bg: "#666666" });
		/* unexplored layer: darkness */
		expect(layered[2]?.[29]).toEqual({ glyph: "　" });
	});
});
