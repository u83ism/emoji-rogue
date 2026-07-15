import { describe, expect, it } from "vitest";
import { ZOMBIE_MAX_HP } from "./balance.js";
import { applyPlayerAttack, isAdjacent } from "./combat.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy } from "./state.js";

const zombie = (x: number, y: number, hp = ZOMBIE_MAX_HP): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp,
});

describe("isAdjacent", () => {
	it("is true for the four orthogonal neighbors only", () => {
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 1 })).toBe(true);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
		/* diagonals and the same tile are out of reach */
		expect(isAdjacent({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
		expect(isAdjacent({ x: 2, y: 2 }, { x: 2, y: 4 })).toBe(false);
	});
});

describe("applyPlayerAttack", () => {
	const state = buildArenaGameState(9, 9, 1);

	it("damages the target (a roll around playerAttackDamage) and logs the hit", () => {
		/* plenty of hp so the target survives regardless of the exact roll */
		const target = zombie(5, 4, 20);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		const [hitEvent] = next.events;
		if (hitEvent?.type !== "enemy-hit") {
			throw new Error("unreachable: applyPlayerAttack always logs enemy-hit");
		}
		const damage = hitEvent.payload.damage;
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(state.playerAttackDamage + 3);
		expect(next.enemies).toEqual([zombie(5, 4, 20 - damage), bystander]);
		expect(next.rng).not.toEqual(state.rng); /* the roll consumed randomness */
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, 1);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([bystander]);
		expect(next.events[0]).toMatchObject({
			type: "enemy-hit",
			payload: { target: "zombie" },
		});
		expect(next.events[1]).toEqual({
			type: "enemy-defeated",
			payload: { target: "zombie" },
		});
	});

	it("does not move the player or touch the terrain", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.player).toEqual(state.player);
		expect(next.terrain).toBe(state.terrain);
	});

	it("rolls around playerAttackDamage, not a hardcoded base (a sword raises it)", () => {
		const target = zombie(5, 4, 20);
		const boosted = { ...state, playerAttackDamage: 3, enemies: [target] };
		const next = applyPlayerAttack(boosted, target);
		const [hitEvent] = next.events;
		if (hitEvent?.type !== "enemy-hit") {
			throw new Error("unreachable: applyPlayerAttack always logs enemy-hit");
		}
		const damage = hitEvent.payload.damage;
		/* clearly rolling around the boosted mean (3), not the base (1) */
		expect(damage).toBeGreaterThanOrEqual(2);
		expect(damage).toBeLessThanOrEqual(4);
		expect(next.enemies).toEqual([zombie(5, 4, 20 - damage)]);
	});
});
