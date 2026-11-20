import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import { advanceTurn } from "../advanceTurn.js";
import {
	calculateMagicSaveChancePercent,
	MAGIC_MISSILE_DAMAGE_BONUS,
	PLAYER_START_STRENGTH,
} from "../balance.js";
import { calculateStrengthDamageBonus } from "../combat/strength.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import type { EnemyKind } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy } from "../state.js";
import { applyMagicMissileWandStrike } from "./wands.js";

/** add_dam[] for the starting strength of 16. */
const START_STRENGTH_DAMAGE = calculateStrengthDamageBonus(
	PLAYER_START_STRENGTH,
);

const zombie = (x: number, y: number, hp = 2, awake = true): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp,
	maxHp: hp,
	awake,
	speed: "normal" as const,
	held: false,
	confusedTurnsRemaining: 0,
});

/** 60 consecutive rng states — enough spread to see both outcomes of a percent roll. */
const buildSpreadRngStates = (): readonly RngState[] => {
	const states: RngState[] = [];
	let current = seedToState(1);
	for (let i = 0; i < 60; i++) {
		states.push(current);
		current = stepUniform(current).state;
	}
	return states;
};

describe("items/wands", () => {
	it("a slow wand slows the nearest visible enemy for good, waking it", () => {
		const target = zombie(7, 1, 2, false); /* 3 tiles east, asleep */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "slow-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player); /* the player does not move */
		/* advanceEnemies runs as part of the same turn: the slowed zombie acts
		 * on that move (one step west) and rests on the next */
		expect(next.enemies).toEqual([
			{ ...target, x: 6, awake: true, speed: "slowed-resting" },
		]);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "enemy-slowed", payload: { target: "zombie" } },
		]);
	});

	it("a slow wand on a hasted monster only takes its haste away", () => {
		const target = { ...zombie(7, 1), speed: "hasted" as const };
		const next = advanceTurn(
			{
				...buildArenaGameState(9, 3, 1),
				enemies: [target],
				inventory: [{ itemId: 1, kind: "slow-wand" as const }],
			},
			{ type: "use-item", payload: { itemId: 1 } },
		);
		expect(next.enemies[0]?.speed).toBe("normal");
		expect(next.events).toEqual([
			{ type: "enemy-slowed-removed", payload: { target: "zombie" } },
		]);
	});

	it("using a held slow wand targets whichever visible enemy is closest", () => {
		const near = zombie(6, 1);
		const far = zombie(8, 1);
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [far, near],
			inventory: [{ itemId: 1, kind: "slow-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.events).toEqual([
			{ type: "enemy-slowed", payload: { target: "zombie" } },
		]);
		expect(
			next.enemies.filter((enemy) => enemy.speed !== "normal"),
		).toHaveLength(1);
		expect(next.enemies.find((enemy) => enemy.speed !== "normal")?.x).toBe(5);
	});

	it("using a held slow wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "slow-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("a held magic missile wand is used up on the nearest visible enemy, which either takes the bolt or saves against it", () => {
		const outcomes = buildSpreadRngStates().map((rng) => {
			const state = {
				...buildArenaGameState(9, 3, 1),
				rng,
				enemies: [zombie(7, 1, 100)],
				inventory: [{ itemId: 1, kind: "magic-missile-wand" as const }],
			};
			const next = advanceTurn(state, {
				type: "use-item",
				payload: { itemId: 1 },
			});
			expect(next.player).toEqual(state.player);
			expect(next.inventory).toEqual([]);
			return next.events[0]?.type;
		});
		expect(outcomes).toContain("wand-struck");
		expect(outcomes).toContain("magic-missile-vanished");
	});

	it("using a held magic missile wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "magic-missile-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});

describe("applyMagicMissileWandStrike", () => {
	const state = buildArenaGameState(9, 9, 1);
	const outcomesFor = (target: Enemy) =>
		buildSpreadRngStates().map((rng) =>
			applyMagicMissileWandStrike({ ...state, rng, enemies: [target] }, target),
		);

	it("a landed bolt deals 1d4 + 1 + the player's damage bonus and logs wand-struck; a saved one vanishes harmlessly", () => {
		const target = zombie(5, 4, 100, false);
		const minimum = 1 + MAGIC_MISSILE_DAMAGE_BONUS + START_STRENGTH_DAMAGE;
		const maximum = 4 + MAGIC_MISSILE_DAMAGE_BONUS + START_STRENGTH_DAMAGE;
		for (const next of outcomesFor(target)) {
			const event = next.events[0];
			if (event?.type === "wand-struck") {
				expect(event.payload.damage).toBeGreaterThanOrEqual(minimum);
				expect(event.payload.damage).toBeLessThanOrEqual(maximum);
				expect(next.enemies).toEqual([
					{ ...target, hp: 100 - event.payload.damage, awake: true },
				]);
			} else {
				expect(next.events).toEqual([
					{ type: "magic-missile-vanished", payload: { target: "zombie" } },
				]);
				/* a vanished missile leaves the target as it was — still asleep */
				expect(next.enemies).toEqual([target]);
			}
		}
	});

	it("the target saves against magic about as often as its level says", () => {
		const saved = (kind: EnemyKind): number =>
			outcomesFor({ ...zombie(5, 4, 100), kind }).filter(
				(next) => next.events[0]?.type === "magic-missile-vanished",
			).length;
		/* zombie (level 2): 25%; dragon (level 10): 45% */
		expect(calculateMagicSaveChancePercent(ENEMY_STATS.zombie.level)).toBe(25);
		expect(calculateMagicSaveChancePercent(ENEMY_STATS.dragon.level)).toBe(45);
		expect(saved("zombie")).toBeGreaterThan(0);
		expect(saved("dragon")).toBeGreaterThan(saved("zombie"));
	});

	it("a landed bolt that brings the target to zero removes it and logs the defeat", () => {
		const target = zombie(5, 4, 1);
		const next = outcomesFor(target).find(
			(outcome) => outcome.events[0]?.type === "wand-struck",
		);
		expect(next?.enemies).toEqual([]);
		expect(next?.events.map((event) => event.type)).toEqual([
			"wand-struck",
			"enemy-defeated",
		]);
	});
});
