import { describe, expect, it } from "vitest";
import { advanceTurn } from "../../advanceTurn.js";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy } from "../../state.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 20,
	maxHp: 20,
	awake: false,
	speed: "normal",
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
});

describe("the teleport to wand", () => {
	it("brings the monster its bolt meets next to the player, awake, and stays unknown", () => {
		/* a 9x3 arena, the player at (4,1), the zombie east at (7,1) */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(7, 1)],
			inventory: [{ itemId: 1, kind: "teleport-to-wand" as const, charges: 5 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, direction: "east" },
		});
		expect(next.events[0]).toEqual({
			type: "enemy-pulled",
			payload: { target: "zombie" },
		});
		/* pulled to (5,1), awake — and it bites in the same turn */
		expect(next.enemies[0]).toMatchObject({ x: 5, y: 1, awake: true });
		expect(next.identifiedItemKinds).toEqual([]);
	});
});
