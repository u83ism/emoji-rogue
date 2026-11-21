import { describe, expect, it } from "vitest";
import { seedToState, stepUniform } from "../../../rng.js";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy, Item } from "../../state.js";
import { applyUsePolymorphWand } from "./polymorphWand.js";

const potion: Item = { x: 0, y: 0, kind: "heal-potion" };
const zombie: Enemy = {
	x: 7,
	y: 1,
	kind: "zombie",
	hp: 5,
	maxHp: 5,
	awake: true,
	speed: "normal",
	held: false,
	carried: [potion],
	mean: true,
	gazeUsed: false,
	confused: false,
	invisible: false,
	cancelled: false,
};

describe("applyUsePolymorphWand", () => {
	it("rebirths the monster its bolt meets as some kind, asleep, keeping its place and pack", () => {
		const kinds = new Set<string>();
		let rng = seedToState(1);
		for (let i = 0; i < 60; i++) {
			const state = { ...buildArenaGameState(9, 3, 1), rng, enemies: [zombie] };
			const next = applyUsePolymorphWand(state, "east");
			const reborn = next.enemies[0];
			expect(reborn).toMatchObject({
				x: 7,
				y: 1,
				awake: false,
				carried: [potion],
			});
			kinds.add(reborn?.kind ?? "");
			rng = stepUniform(rng).state;
		}
		expect(kinds.size).toBeGreaterThan(10);
	});
});
