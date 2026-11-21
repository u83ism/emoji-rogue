import { describe, expect, it } from "vitest";
import { stepUniform } from "../rng.js";
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
	it("moves the monster its bolt meets to a different tile, wakes it, and logs enemy-teleported", () => {
		const target: Enemy = {
			x: 7,
			y: 1,
			kind: "zombie",
			hp: 2,
			maxHp: 2,
			awake: false,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			cancelled: false,
			invisible: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "teleport-wand" as const, charges: 5 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, direction: "east" },
		});
		expect(next.player).toEqual(state.player);
		/* the zap spends a charge; the wand stays */
		expect(next.inventory).toEqual([
			{ itemId: 1, kind: "teleport-wand", charges: 4 },
		]);
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
		/* a 9x9 room, the player at (4,4), the target east, the room crowded */
		const arena = buildArenaGameState(9, 9, 1);
		const crowd: Enemy[] = [];
		for (let x = 1; x <= 7; x++) {
			for (let y = 1; y <= 7; y += 2) {
				crowd.push({ ...zombieAt(x, y) });
			}
		}
		let rng = arena.rng;
		for (let attempt = 0; attempt < 20; attempt++) {
			const next = advanceTurn(
				{
					...arena,
					rng,
					enemies: [zombieAt(5, 4), ...crowd],
					inventory: [
						{ itemId: 1, kind: "teleport-wand" as const, charges: 5 },
					],
				},
				{ type: "use-item", payload: { itemId: 1, direction: "east" } },
			);
			const positions = next.enemies.map((enemy) => `${enemy.x},${enemy.y}`);
			expect(new Set(positions).size).toBe(positions.length);
			rng = stepUniform(rng).state;
		}
	});

	it("a teleport wand zapped with no direction is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "teleport-wand" as const, charges: 5 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});

const zombieAt = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 2,
	maxHp: 2,
	awake: false,
	speed: "normal",
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});
