import { describe, expect, it } from "vitest";
import { WAND_STRIKE_DAMAGE, ZOMBIE_MAX_HP } from "./balance.js";
import { applyPlayerAttack, applyWandStrike, isAdjacent } from "./combat.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy } from "./state.js";

const zombie = (
	x: number,
	y: number,
	hp = ZOMBIE_MAX_HP,
	awake = true,
): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp,
	awake,
	slowedTurnsRemaining: 0,
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

	it("damages the target and logs the hit", () => {
		const target = zombie(5, 4);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([zombie(5, 4, ZOMBIE_MAX_HP - 1), bystander]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
		]);
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, 1);
		const bystander = zombie(7, 7);
		const next = applyPlayerAttack(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([bystander]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("does not move the player or touch the terrain", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.player).toEqual(state.player);
		expect(next.terrain).toBe(state.terrain);
	});

	it("deals playerAttackDamage, not a hardcoded amount (a sword raises it)", () => {
		const target = zombie(5, 4, 10);
		const boosted = { ...state, playerAttackDamage: 3, enemies: [target] };
		const next = applyPlayerAttack(boosted, target);
		expect(next.enemies).toEqual([zombie(5, 4, 7)]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 3 } },
		]);
	});

	it("a sneak attack on a sleeping target deals SNEAK_ATTACK_MULTIPLIER times the damage and wakes it", () => {
		const target = zombie(5, 4, 10, false);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([zombie(5, 4, 7, true)]);
		expect(next.events).toEqual([
			{ type: "sneak-attack", payload: { target: "zombie", damage: 3 } },
		]);
	});

	it("a sneak attack that kills logs sneak-attack then enemy-defeated", () => {
		const target = zombie(5, 4, 3, false);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([]);
		expect(next.events).toEqual([
			{ type: "sneak-attack", payload: { target: "zombie", damage: 3 } },
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("a follow-up attack on an already-awake target is a normal hit, not another sneak attack", () => {
		const target = zombie(5, 4, 10, true);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([zombie(5, 4, 9, true)]);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
		]);
	});
});

describe("applyWandStrike", () => {
	const state = buildArenaGameState(9, 9, 1);

	it("deals a fixed WAND_STRIKE_DAMAGE regardless of playerAttackDamage and logs wand-struck", () => {
		const target = zombie(5, 4, 10);
		const boosted = { ...state, playerAttackDamage: 99, enemies: [target] };
		const next = applyWandStrike(boosted, target);
		expect(next.enemies).toEqual([zombie(5, 4, 10 - WAND_STRIKE_DAMAGE)]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
		]);
	});

	it("removes a target whose hp reaches zero and logs the defeat", () => {
		const target = zombie(5, 4, WAND_STRIKE_DAMAGE);
		const bystander = zombie(7, 7);
		const next = applyWandStrike(
			{ ...state, enemies: [target, bystander] },
			target,
		);
		expect(next.enemies).toEqual([bystander]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("wakes a sleeping target but never applies a sneak-attack multiplier", () => {
		const target = zombie(5, 4, 10, false);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.enemies).toEqual([zombie(5, 4, 10 - WAND_STRIKE_DAMAGE, true)]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
		]);
	});

	it("does not move the player or touch the terrain", () => {
		const target = zombie(5, 4);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.player).toEqual(state.player);
		expect(next.terrain).toBe(state.terrain);
	});
});
