import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { Enemy, GameState } from "../game/state.js";
import { findAdjacentEnemyDirection } from "./combatPolicy.js";

const baseState = (): GameState => buildArenaGameState(9, 9, 1);

const enemyAt = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 2,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

describe("findAdjacentEnemyDirection", () => {
	it("is undefined with no enemies nearby", () => {
		expect(findAdjacentEnemyDirection(baseState())).toBeUndefined();
	});

	it("is undefined for an enemy that is merely nearby, not adjacent", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 2)] };
		expect(findAdjacentEnemyDirection(state)).toBeUndefined();
	});

	it("points at an enemy directly north", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 3)] };
		expect(findAdjacentEnemyDirection(state)).toBe("north");
	});

	it("points at an enemy directly south", () => {
		const state = { ...baseState(), enemies: [enemyAt(4, 5)] };
		expect(findAdjacentEnemyDirection(state)).toBe("south");
	});

	it("points at an enemy directly west", () => {
		const state = { ...baseState(), enemies: [enemyAt(3, 4)] };
		expect(findAdjacentEnemyDirection(state)).toBe("west");
	});

	it("points at an enemy directly east", () => {
		const state = { ...baseState(), enemies: [enemyAt(5, 4)] };
		expect(findAdjacentEnemyDirection(state)).toBe("east");
	});

	it("returns an adjacent enemy regardless of whether it is still asleep", () => {
		const state = {
			...baseState(),
			enemies: [{ ...enemyAt(4, 3), awake: false }],
		};
		expect(findAdjacentEnemyDirection(state)).toBe("north");
	});
});
