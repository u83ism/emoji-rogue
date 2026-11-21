import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy } from "../../state.js";
import { applyUseDrainLifeWand } from "./drainWand.js";

const zombie = (x: number, y: number, hp: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp,
	maxHp: 30,
	awake: false,
	speed: "normal",
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
});

describe("applyUseDrainLifeWand", () => {
	it("halves the player's HP and shares it out among the monsters of the room, killing the weak as the player's kills", () => {
		/* a 9x5 arena, one room: both zombies are in it */
		const state = {
			...buildArenaGameState(9, 5, 1),
			playerHp: 21,
			playerMaxHp: 30,
			enemies: [zombie(6, 1, 30), zombie(2, 3, 4)],
		};
		const next = applyUseDrainLifeWand(state, "north");
		/* 21 halved to 10 (a level gained from the kill may add some back) */
		expect(next.events).toContainEqual({
			type: "life-drained",
			payload: { lost: 11 },
		});
		/* 10 shared by two: 5 each — the 4-HP zombie dies */
		expect(next.enemies).toHaveLength(1);
		expect(next.enemies[0]).toMatchObject({ hp: 25, awake: true });
		expect(next.events.map((event) => event.type)).toEqual(
			expect.arrayContaining([
				"life-drained",
				"enemy-drained",
				"enemy-defeated",
			]),
		);
		expect(next.playerExperience).toBeGreaterThan(state.playerExperience);
	});

	it("only tingles with no monster in reach, and cannot be used under 2 HP", () => {
		const alone = buildArenaGameState(9, 5, 1);
		const tingled = applyUseDrainLifeWand(alone, "north");
		expect(tingled.playerHp).toBe(alone.playerHp);
		expect(tingled.events.at(-1)?.type).toBe("tingling");
		const weak = { ...alone, playerHp: 1, enemies: [zombie(6, 1, 30)] };
		expect(applyUseDrainLifeWand(weak, "north")).toBe(weak);
	});
});
