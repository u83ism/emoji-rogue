import { describe, expect, it } from "vitest";
import { encodePointKey } from "../../pointkey.js";
import { createRng } from "../../rng.js";
import {
	WANDERER_DELAY_TURNS,
	WANDERER_ROLL_INTERVAL_TURNS,
} from "../balance.js";
import { NON_WANDERING_ENEMY_KINDS } from "../enemies/enemyStats.js";
import { calculateEnemyFloorRange } from "../floor/enemies.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { computeVisiblePoints, resolveViewRadius } from "../vision.js";
import { applyWandererTick, drawWandererDelay } from "./wanderer.js";

/** A real dungeon (plenty of floor out of sight) with no residents, so every enemy in it is a wanderer. */
const buildEmptyDungeon = (seed: number): GameState => ({
	...buildDungeonGameState(40, 20, seed),
	enemies: [],
});

/** Ticks until an enemy appears, returning the state it appeared in and how many ticks that took. */
const tickUntilArrival = (
	start: GameState,
): { readonly state: GameState; readonly ticks: number } => {
	let state = start;
	for (let ticks = 1; ticks <= 5000; ticks++) {
		state = applyWandererTick(state);
		if (state.enemies.length > start.enemies.length) {
			return { state, ticks };
		}
	}
	throw new Error("no wanderer arrived within 5000 ticks");
};

describe("drawWandererDelay", () => {
	it("is 67-73 turns, as original Rogue's spread(70)", () => {
		const rng = createRng(1);
		const delays = new Set(
			Array.from({ length: 500 }, () => drawWandererDelay(rng)),
		);
		expect(Math.min(...delays)).toBe(67);
		expect(Math.max(...delays)).toBe(73);
	});
});

describe("applyWandererTick", () => {
	it("first only counts the delay down, touching nothing else", () => {
		const state = buildEmptyDungeon(1);
		const next = applyWandererTick(state);
		expect(next.wandererDelayTurns).toBe(state.wandererDelayTurns - 1);
		expect(next.enemies).toEqual([]);
		expect(next.rng).toEqual(state.rng);
	});

	it("once the delay is spent, rolls only every WANDERER_ROLL_INTERVAL_TURNS-th turn", () => {
		let state: GameState = { ...buildEmptyDungeon(1), wandererDelayTurns: 0 };
		const startRng = state.rng;
		for (let tick = 1; tick < WANDERER_ROLL_INTERVAL_TURNS; tick++) {
			state = applyWandererTick(state);
			expect(state.rng).toEqual(startRng);
			expect(state.wandererRollTurns).toBe(tick);
		}
		state = applyWandererTick(state);
		expect(state.rng).not.toEqual(startRng);
		expect(state.wandererRollTurns).toBe(0);
	});

	it("never brings one before the delay has run out", () => {
		const start = buildEmptyDungeon(1);
		expect(tickUntilArrival(start).ticks).toBeGreaterThan(
			start.wandererDelayTurns,
		);
	});

	it("the wanderer arrives awake, at full HP, on a floor tile the player cannot see", () => {
		const start = buildEmptyDungeon(3);
		const { state } = tickUntilArrival(start);
		const wanderer = state.enemies[0];
		if (wanderer === undefined) {
			throw new Error("unreachable: an enemy arrived");
		}
		expect(wanderer.awake).toBe(true);
		expect(wanderer.hp).toBe(wanderer.maxHp);
		expect(state.terrain[wanderer.x]?.[wanderer.y]).toBe(0);
		const visiblePoints = computeVisiblePoints(
			state.terrain,
			state.player,
			resolveViewRadius(state),
		);
		expect(visiblePoints.has(encodePointKey(wanderer.x, wanderer.y))).toBe(
			false,
		);
		expect(state.events).toEqual(start.events); /* silent */
	});

	it("starts the delay over after an arrival", () => {
		const { state } = tickUntilArrival(buildEmptyDungeon(3));
		expect(state.wandererDelayTurns).toBeGreaterThanOrEqual(67);
		expect(state.wandererDelayTurns).toBeLessThanOrEqual(73);
		expect(state.wandererRollTurns).toBe(0);
	});

	it("only ever brings kinds that wander and that belong to the floor", () => {
		let checked = buildEmptyDungeon(5);
		for (let arrival = 0; arrival < 40; arrival++) {
			const arrived = tickUntilArrival(checked).state;
			const kind = arrived.enemies[0]?.kind;
			if (kind === undefined) {
				throw new Error("unreachable: an enemy arrived");
			}
			expect(NON_WANDERING_ENEMY_KINDS).not.toContain(kind);
			expect(calculateEnemyFloorRange(kind).firstFloor).toBeLessThanOrEqual(
				arrived.floor,
			);
			checked = { ...arrived, enemies: [] };
		}
	});

	it("arrives about once every 94 turns on average (70 of delay, then 6 rolls 4 turns apart)", () => {
		let state = buildEmptyDungeon(9);
		let totalTicks = 0;
		const arrivals = 60;
		for (let arrival = 0; arrival < arrivals; arrival++) {
			const result = tickUntilArrival(state);
			totalTicks += result.ticks;
			state = { ...result.state, enemies: [] };
		}
		const average = totalTicks / arrivals;
		expect(average).toBeGreaterThan(WANDERER_DELAY_TURNS + 12);
		expect(average).toBeLessThan(WANDERER_DELAY_TURNS + 40);
	});

	it("brings nothing where the player can see every floor tile, but keeps rolling", () => {
		/* a small open arena: nothing is out of sight */
		let state: GameState = {
			...buildArenaGameState(7, 7, 1),
			wandererDelayTurns: 0,
		};
		for (let tick = 0; tick < 600; tick++) {
			state = applyWandererTick(state);
		}
		expect(state.enemies).toEqual([]);
		expect(state.wandererDelayTurns).toBe(0);
	});

	it("is a no-op (same reference) once the run is no longer playing", () => {
		const state: GameState = { ...buildEmptyDungeon(1), status: "dead" };
		expect(applyWandererTick(state)).toBe(state);
	});
});
