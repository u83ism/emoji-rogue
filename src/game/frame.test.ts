import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildFrameGrid } from "./frame.js";
import { buildInitialGameState } from "./initialState.js";

describe("buildFrameGrid", () => {
	const state = buildInitialGameState(5, 4, 1);
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
});
