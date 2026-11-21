import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import type { EnemyKind } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, GameState, HeldItem } from "../state.js";
import {
	applyLookWake,
	applyRoomEntryWake,
	ENEMY_IS_MEAN,
} from "./wakeMonster.js";

const sleeper = (kind: EnemyKind, x: number, y: number): Enemy => ({
	x,
	y,
	kind,
	hp: 10,
	maxHp: 10,
	awake: false,
	speed: "normal",
	held: false,
	carried: [],
	mean: ENEMY_IS_MEAN[kind],
	gazeUsed: false,
	confused: false,
});

/* a 9x5 arena — one lit room (1..7, 1..3) — the player at (4,2) */
const withEnemies = (
	enemies: readonly Enemy[],
	rng: RngState,
	overrides: Partial<GameState> = {},
): GameState => ({
	...buildArenaGameState(9, 5, 1),
	rng,
	enemies,
	...overrides,
});

/** How many of 300 successive rng states leave the first enemy awake after `wake` (neighboring seeds roll alike on their first draw). */
const countWoken = (
	enemy: Enemy,
	wake: (state: GameState) => GameState,
	overrides: Partial<GameState> = {},
): number => {
	let woken = 0;
	let rng = seedToState(1);
	for (let i = 0; i < 300; i++) {
		if (wake(withEnemies([enemy], rng, overrides)).enemies[0]?.awake) {
			woken++;
		}
		rng = stepUniform(rng).state;
	}
	return woken;
};

const stealthRing: HeldItem = {
	itemId: 1,
	kind: "stealth-ring",
	equipped: true,
	cursed: false,
};

describe("applyLookWake", () => {
	it("wakes a mean monster next to the player two times in three", () => {
		const woken = countWoken(sleeper("zombie", 5, 2), applyLookWake);
		expect(woken).toBeGreaterThan(170);
		expect(woken).toBeLessThan(230);
		/* a diagonal neighbor counts too */
		expect(countWoken(sleeper("zombie", 5, 3), applyLookWake)).toBeGreaterThan(
			170,
		);
	});

	it("never wakes a monster that is not mean, nor one two tiles away", () => {
		expect(countWoken(sleeper("bat", 5, 2), applyLookWake)).toBe(0);
		const far = withEnemies([sleeper("zombie", 6, 2)], seedToState(1));
		expect(applyLookWake(far)).toBe(far);
	});

	it("always wakes a greedy orc, even through a ring of stealth", () => {
		expect(countWoken(sleeper("orc", 5, 2), applyLookWake)).toBe(300);
		expect(
			countWoken(sleeper("orc", 5, 2), applyLookWake, {
				inventory: [stealthRing],
			}),
		).toBe(300);
	});

	it("sends a woken orc to guard the gold of the player's room", () => {
		const state = withEnemies([sleeper("orc", 5, 2)], seedToState(1), {
			goldPiles: [{ x: 7, y: 3, amount: 20 }],
		});
		expect(applyLookWake(state).enemies[0]?.goal).toEqual({ x: 7, y: 3 });
	});

	it("leaves a mean monster asleep under a ring of stealth, while floating, or held", () => {
		const zombie = sleeper("zombie", 5, 2);
		expect(
			countWoken(zombie, applyLookWake, { inventory: [stealthRing] }),
		).toBe(0);
		expect(
			countWoken(zombie, applyLookWake, { levitationTurnsRemaining: 5 }),
		).toBe(0);
		expect(countWoken({ ...zombie, held: true }, applyLookWake)).toBe(0);
	});

	it("skips a diagonal neighbor across a corner of rock", () => {
		const base = withEnemies([sleeper("orc", 5, 3)], seedToState(1));
		const terrain = base.terrain.map((column) => [...column]);
		/* rock on both tiles between the player (4,2) and the orc (5,3) */
		const columnFive = terrain[5];
		const columnFour = terrain[4];
		if (columnFive === undefined || columnFour === undefined) {
			throw new Error("arena too small");
		}
		columnFive[2] = 1;
		columnFour[3] = 1;
		const cornered = { ...base, terrain };
		expect(applyLookWake(cornered).enemies[0]?.awake).toBe(false);
	});
});

describe("applyRoomEntryWake", () => {
	it("gives every mean monster in the player's room two tries (8 in 9)", () => {
		const woken = countWoken(sleeper("zombie", 7, 3), applyRoomEntryWake);
		expect(woken).toBeGreaterThan(245);
		expect(woken).toBeLessThan(290);
	});

	it("does nothing while the player is out of every room", () => {
		const outside = withEnemies([sleeper("orc", 7, 3)], seedToState(1), {
			rooms: [],
		});
		expect(applyRoomEntryWake(outside)).toBe(outside);
	});
});
