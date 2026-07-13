import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { advanceEnemies } from "./enemies.js";
import { buildArenaGameState } from "./initialState.js";
import type { GameState } from "./state.js";

/** 9x3 arena: one walkable row at y=1, player at (4,1). */
const buildCorridorState = (enemies: GameState["enemies"]): GameState => ({
	...buildArenaGameState(9, 3, 1),
	enemies,
});

const buildUnexplored7x3 = (): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < 7; x++) {
		columns.push(new Array<boolean>(3).fill(false));
	}
	return columns;
};

describe("advanceEnemies", () => {
	it("a visible enemy chases the player via A*, consuming no rng", () => {
		const state = buildCorridorState([{ x: 7, y: 1 }]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([{ x: 6, y: 1 }]);
		expect(next.status).toBe("playing");
		expect(next.rng).toEqual(state.rng);
	});

	it("an enemy stepping onto the player ends the run", () => {
		const state = buildCorridorState([{ x: 5, y: 1 }]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([{ x: 4, y: 1 }]);
		expect(next.status).toBe("dead");
	});

	it("enemies never stack on the same tile", () => {
		/* both chase the player westwards along the single row */
		const state = buildCorridorState([
			{ x: 6, y: 1 },
			{ x: 7, y: 1 },
		]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			{ x: 5, y: 1 },
			{ x: 6, y: 1 },
		]);
	});

	it("an unseen enemy wanders, consuming the state's rng", () => {
		/* 7x3 corridor cut by a wall at x=3: the enemy at (5,1) is hidden */
		const state: GameState = {
			width: 7,
			height: 3,
			terrain: [
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
			],
			explored: buildUnexplored7x3(),
			player: { x: 1, y: 1 },
			enemies: [{ x: 5, y: 1 }],
			rng: seedToState(1),
			status: "playing",
		};
		const next = advanceEnemies(state);
		/* (4,1) is the only open neighbor */
		expect(next.enemies).toEqual([{ x: 4, y: 1 }]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("is deterministic: same state in, same state out", () => {
		const state = buildCorridorState([{ x: 7, y: 1 }]);
		expect(advanceEnemies(state)).toEqual(advanceEnemies(state));
	});
});
