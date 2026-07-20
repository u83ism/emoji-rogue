import { describe, expect, it } from "vitest";
import {
	ENEMY_EXPERIENCE_REWARD,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	ORC_MAX_HP,
	WAND_STRIKE_DAMAGE,
	ZOMBIE_MAX_HP,
} from "./balance.js";
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

const orc = (x: number, y: number, hp = ORC_MAX_HP, awake = true): Enemy => ({
	x,
	y,
	kind: "orc",
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

	it("deals calculatePlayerAttackDamage's total, not a hardcoded amount (an equipped sword raises it)", () => {
		const target = zombie(5, 4, 10);
		const boosted = {
			...state,
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: true,
					cursed: false,
					attackBonus: 2,
				},
			],
			enemies: [target],
		};
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

	it("a kill awards experience for the target's kind", () => {
		const target = zombie(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(ENEMY_EXPERIENCE_REWARD.zombie);
	});

	it("a non-lethal hit awards no experience", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(state.playerExperience);
	});

	it("sets hasAttacked — the pacifist conduct is broken by any landed attack", () => {
		const target = zombie(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.hasAttacked).toBe(true);
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

	it("a kill awards experience for the target's kind", () => {
		const target = zombie(5, 4, WAND_STRIKE_DAMAGE);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.playerExperience).toBe(ENEMY_EXPERIENCE_REWARD.zombie);
	});

	it("sets hasAttacked — the pacifist conduct is broken by a wand strike too", () => {
		const target = zombie(5, 4);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.hasAttacked).toBe(true);
	});
});

describe("orc gold drop", () => {
	const state = buildArenaGameState(9, 9, 1);

	it("drops a bonus between GOLD_AMOUNT_MIN and GOLD_AMOUNT_MAX into goldCollected on a melee kill", () => {
		const target = orc(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const dropped = next.goldCollected - state.goldCollected;
		expect(dropped).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
		expect(dropped).toBeLessThanOrEqual(GOLD_AMOUNT_MAX);
		expect(next.events).toContainEqual({
			type: "orc-gold-drop",
			payload: { amount: dropped },
		});
	});

	it("also drops gold on a wand kill", () => {
		const target = orc(5, 4, WAND_STRIKE_DAMAGE);
		const next = applyWandStrike({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBeGreaterThan(state.goldCollected);
		expect(next.events.some((event) => event.type === "orc-gold-drop")).toBe(
			true,
		);
	});

	it("is deterministic for a given rng state", () => {
		const target = orc(5, 4, 1);
		const first = applyPlayerAttack({ ...state, enemies: [target] }, target);
		const second = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(first.goldCollected).toBe(second.goldCollected);
	});

	it("does not drop gold when a non-orc is killed", () => {
		const target = zombie(5, 4, 1);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBe(state.goldCollected);
		expect(next.events.some((event) => event.type === "orc-gold-drop")).toBe(
			false,
		);
	});

	it("does not drop gold on a non-lethal hit", () => {
		const target = orc(5, 4);
		const next = applyPlayerAttack({ ...state, enemies: [target] }, target);
		expect(next.goldCollected).toBe(state.goldCollected);
	});
});
