import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import { resolveStairsHint } from "./systemMessages.js";

describe("resolveStairsHint", () => {
	it("tells the key while the player stands on the staircase, and nothing elsewhere", () => {
		const arena = buildArenaGameState(9, 3, 1);
		const onStairs = { ...arena, stairs: { ...arena.player } };
		expect(resolveStairsHint(onStairs)).toBe("階段です。> で下ります");
		expect(resolveStairsHint({ ...onStairs, hasAmulet: true })).toBe(
			"階段です。< で上ります(> で下ります)",
		);
		expect(resolveStairsHint(arena)).toBeUndefined();
	});
});
