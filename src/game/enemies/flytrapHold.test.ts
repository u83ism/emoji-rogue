import { describe, expect, it } from "vitest";
import { seedToState } from "../../rng.js";
import type { Enemy } from "../state.js";
import { isHeldByFlytrap, resolveFlytrapAttack } from "./flytrapHold.js";

const RNG = seedToState(1);
const SURE_HIT = 100;
const SURE_MISS = 0;

describe("resolveFlytrapAttack", () => {
	it("a first bite that lands costs 1 HP and starts the hold", () => {
		const result = resolveFlytrapAttack(0, 20, SURE_HIT, RNG);
		expect(result.flytrapHoldDamage).toBe(1);
		expect(result.playerHp).toBe(19);
		expect(result.events).toEqual([
			{ type: "player-hit", payload: { by: "venus-flytrap", damage: 1 } },
		]);
		expect(result.died).toBe(false);
	});

	it("every further bite costs one more than the last", () => {
		let playerHp = 100;
		let holdDamage = 0;
		const losses: number[] = [];
		for (let turn = 0; turn < 4; turn++) {
			const result = resolveFlytrapAttack(holdDamage, playerHp, SURE_HIT, RNG);
			losses.push(playerHp - result.playerHp);
			playerHp = result.playerHp;
			holdDamage = result.flytrapHoldDamage;
		}
		expect(losses).toEqual([1, 2, 3, 4]);
	});

	it("a miss before the first bite is a plain miss", () => {
		const result = resolveFlytrapAttack(0, 20, SURE_MISS, RNG);
		expect(result.flytrapHoldDamage).toBe(0);
		expect(result.playerHp).toBe(20);
		expect(result.events).toEqual([
			{ type: "enemy-attack-missed", payload: { by: "venus-flytrap" } },
		]);
	});

	it("a miss once the hold has started still squeezes for the built-up amount, without growing it", () => {
		const result = resolveFlytrapAttack(3, 20, SURE_MISS, RNG);
		expect(result.flytrapHoldDamage).toBe(3);
		expect(result.playerHp).toBe(17);
		expect(result.events).toEqual([
			{ type: "player-hit", payload: { by: "venus-flytrap", damage: 3 } },
		]);
	});

	it("consumes exactly one rng step, hit or miss", () => {
		const hit = resolveFlytrapAttack(0, 20, SURE_HIT, RNG);
		const miss = resolveFlytrapAttack(0, 20, SURE_MISS, RNG);
		expect(hit.rng).not.toEqual(RNG);
		expect(miss.rng).toEqual(hit.rng);
	});

	it("kills when the squeeze takes the last HP", () => {
		const result = resolveFlytrapAttack(4, 5, SURE_HIT, RNG);
		expect(result.playerHp).toBe(0);
		expect(result.died).toBe(true);
		expect(result.events).toEqual([
			{ type: "player-hit", payload: { by: "venus-flytrap", damage: 5 } },
			{ type: "player-died", payload: { by: "venus-flytrap" } },
		]);
	});
});

describe("isHeldByFlytrap", () => {
	const enemyAt = (
		kind: Enemy["kind"],
		x: number,
		y: number,
		awake = true,
	): Enemy => ({
		x,
		y,
		kind,
		hp: 5,
		maxHp: 5,
		awake,
		speed: "normal" as const,
		held: false,
		carried: [],
		mean: false,
		gazeUsed: false,
		confusedTurnsRemaining: 0,
	});
	const player = { x: 2, y: 2 };

	it("is true only for an awake venus-flytrap orthogonally next to the player", () => {
		expect(isHeldByFlytrap([enemyAt("venus-flytrap", 3, 2)], player)).toBe(
			true,
		);
		expect(
			isHeldByFlytrap([enemyAt("venus-flytrap", 3, 2, false)], player),
		).toBe(false);
		expect(isHeldByFlytrap([enemyAt("venus-flytrap", 3, 3)], player)).toBe(
			false,
		);
		expect(isHeldByFlytrap([enemyAt("zombie", 3, 2)], player)).toBe(false);
		expect(isHeldByFlytrap([], player)).toBe(false);
	});
});
