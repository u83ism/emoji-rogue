import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import type { Enemy } from "./state.js";

describe("teleport", () => {
	it("is deterministic: the same state always teleports to the same tile", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "teleport-scroll" } as const],
		};
		const action = {
			type: "use-item",
			payload: { itemId: 1 },
		} as const;
		expect(advanceTurn(state, action)).toEqual(advanceTurn(state, action));
	});

	it("never teleports onto a tile occupied by an enemy", () => {
		let state = buildDungeonGameState(40, 20, 42);
		state = {
			...state,
			inventory: [{ itemId: 1, kind: "teleport-scroll" } as const],
		};
		for (let attempt = 0; attempt < 20; attempt++) {
			const next = advanceTurn(state, {
				type: "use-item",
				payload: { itemId: 1 },
			});
			for (const enemy of next.enemies) {
				expect(enemy.x === next.player.x && enemy.y === next.player.y).toBe(
					false,
				);
			}
			state = { ...next, inventory: state.inventory };
		}
	});
});

describe("teleport wand", () => {
	it("moves the nearest visible enemy to a different tile, wakes it, and logs enemy-teleported", () => {
		const target: Enemy = {
			x: 7,
			y: 1,
			kind: "zombie",
			hp: 2,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "teleport-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player);
		expect(next.inventory).toEqual([]);
		const moved = next.enemies[0];
		expect(moved).toBeDefined();
		expect(moved?.awake).toBe(true);
		expect(moved && (moved.x !== target.x || moved.y !== target.y)).toBe(true);
		expect(
			next.events.some(
				(event) =>
					event.type === "enemy-teleported" &&
					event.payload.target === "zombie",
			),
		).toBe(true);
	});

	it("never lands the target on another enemy's tile", () => {
		let state = buildDungeonGameState(40, 20, 42);
		state = {
			...state,
			inventory: [{ itemId: 1, kind: "teleport-wand" as const }],
		};
		for (let attempt = 0; attempt < 20; attempt++) {
			const next = advanceTurn(state, {
				type: "use-item",
				payload: { itemId: 1 },
			});
			const positions = next.enemies.map((enemy) => `${enemy.x},${enemy.y}`);
			expect(new Set(positions).size).toBe(positions.length);
			state = { ...next, inventory: state.inventory };
		}
	});

	it("using a held teleport wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "teleport-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
