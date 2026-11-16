import { describe, expect, it } from "vitest";
import { encodePointKey } from "../../pointkey.js";
import {
	calculateGoldAmountMax,
	FOOD_ROLLS_PER_FLOOR,
	GOAL_FLOOR,
	GOLD_AMOUNT_MIN,
	POTION_COUNT_PER_FLOOR,
} from "../balance.js";
import { buildDungeonGameState } from "../initialState.js";
import { calculateEnemyFloorRange } from "./enemies.js";
import { ascendStairs, descendStairs } from "./transitions.js";

describe("descendStairs", () => {
	const start = buildDungeonGameState(40, 20, 12345);
	const below = descendStairs({ ...start, playerHp: 5 });

	it("is deterministic: the whole run replays from (dimensions, seed)", () => {
		expect(descendStairs({ ...start, playerHp: 5 })).toEqual(below);
	});

	it("generates a fresh floor: terrain, enemies, stairs, explored", () => {
		expect(below.terrain).not.toEqual(start.terrain);
		expect(below.rng).not.toEqual(start.rng);
		/* the explored grid restarts from the new starting view only */
		expect(below.explored[below.stairs.x]?.[below.stairs.y]).toBe(false);
	});

	it("carries over hp, log and the incremented floor counter", () => {
		expect(below.floor).toBe(start.floor + 1);
		expect(below.playerHp).toBe(5);
		expect(below.events).toEqual([
			{ type: "floor-descended", payload: { floor: 2 } },
		]);
		expect(below.status).toBe("playing");
	});

	it("tracks the deepest floor reached", () => {
		expect(start.deepestFloor).toBe(1);
		expect(below.deepestFloor).toBe(2);
		expect(descendStairs(below).deepestFloor).toBe(3);
	});

	it("leaves a venus-flytrap's hold behind", () => {
		expect(
			descendStairs({ ...start, flytrapHoldDamage: 5 }).flytrapHoldDamage,
		).toBe(0);
	});

	it("resets turnsOnCurrentFloor to 0", () => {
		const loitered = descendStairs({ ...start, turnsOnCurrentFloor: 150 });
		expect(loitered.turnsOnCurrentFloor).toBe(0);
	});

	it("spawns only floor-appropriate enemies, all asleep at full HP", () => {
		for (const state of [start, below]) {
			for (const enemy of state.enemies) {
				expect(
					calculateEnemyFloorRange(enemy.kind).firstFloor,
				).toBeLessThanOrEqual(state.floor);
				expect(enemy.awake).toBe(false);
				expect(enemy.hp).toBe(enemy.maxHp);
			}
		}
	});

	it("places everything on distinct floor tiles", () => {
		for (const state of [start, below]) {
			/* potions are guaranteed; food is a handful of rolls; the weapon is a per-floor chance (0 or 1) */
			expect(
				state.items.filter((item) => item.kind === "heal-potion").length,
			).toBe(POTION_COUNT_PER_FLOOR);
			expect(
				state.items.filter((item) => item.kind === "food").length,
			).toBeLessThanOrEqual(FOOD_ROLLS_PER_FLOOR);
			expect(
				state.items.filter((item) => item.kind === "weapon").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "armor").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "poison").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "teleport-scroll").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "mapping-scroll").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "identify-scroll").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "strength").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.enemies.filter((enemy) => enemy.kind === "thief").length,
			).toBeLessThanOrEqual(1);
			for (const pile of state.goldPiles) {
				expect(pile.amount).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
				expect(pile.amount).toBeLessThanOrEqual(
					calculateGoldAmountMax(state.floor),
				);
			}
			expect(state.traps.filter((trap) => trap.kind === "dart").length).toBe(2);
			expect(
				state.traps.filter((trap) => trap.kind === "trapdoor").length,
			).toBeLessThanOrEqual(1);
			const occupied = new Set([
				encodePointKey(state.player.x, state.player.y),
			]);
			const spawned = [
				state.stairs,
				...state.enemies,
				...state.items,
				...state.goldPiles,
				...state.traps,
			];
			for (const position of spawned) {
				expect(state.terrain[position.x]?.[position.y]).toBe(0);
				const key = encodePointKey(position.x, position.y);
				expect(occupied.has(key)).toBe(false);
				occupied.add(key);
			}
		}
	});

	it("keeps descending: several floors without breaking invariants", () => {
		/* stays comfortably below GOAL_FLOOR — reaching it is covered separately */
		let state = buildDungeonGameState(40, 20, 7);
		for (let i = 0; i < 5; i++) {
			state = descendStairs(state);
			expect(state.floor).toBe(i + 2);
			expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
			expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
		}
	});

	it("GOAL_FLOOR is a real floor: an up staircase and the amulet, not an instant win", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		expect(state.floor).toBe(GOAL_FLOOR);
		expect(state.status).toBe("playing");
		expect(state.stairs.direction).toBe("up");
		expect(state.amulet).not.toBeUndefined();
		expect(state.hasAmulet).toBe(false);
		expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
	});

	it("a forced fall while carrying the amulet still lands on a floor with an up staircase", () => {
		const carrying = { ...start, floor: 5, hasAmulet: true };
		const fallen = descendStairs(carrying);
		expect(fallen.floor).toBe(6);
		expect(fallen.stairs.direction).toBe("up");
	});

	it("falling back onto GOAL_FLOOR while carrying the amulet spawns no second amulet", () => {
		const carrying = { ...start, floor: GOAL_FLOOR - 1, hasAmulet: true };
		const fallen = descendStairs(carrying);
		expect(fallen.floor).toBe(GOAL_FLOOR);
		expect(fallen.amulet).toBeUndefined();
		expect(fallen.stairs.direction).toBe("up");
	});

	it("only spawns kinds whose floor range covers the new floor", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 12; floor++) {
			state = descendStairs(state);
			for (const enemy of state.enemies) {
				const range = calculateEnemyFloorRange(enemy.kind);
				expect(floor).toBeGreaterThanOrEqual(range.firstFloor);
				expect(floor).toBeLessThanOrEqual(range.lastFloor);
				expect(enemy.hp).toBe(enemy.maxHp);
			}
		}
	});
});
describe("ascendStairs", () => {
	it("ascending from floor 2 regenerates floor 1 as a real floor with an up staircase", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		const back = ascendStairs({ ...deep, playerHp: 5 });
		expect(back.floor).toBe(1);
		expect(back.status).toBe("playing"); /* not a finish line anymore */
		expect(back.stairs.direction).toBe("up");
		expect(back.playerHp).toBe(5);
		expect(back.events.at(-1)).toEqual({
			type: "floor-ascended",
			payload: { floor: 1 },
		});
	});

	it("resets turnsOnCurrentFloor to 0 on a mid-retrace ascent", () => {
		/* floor 3, so ascending lands on floor 2 — buildFloorTransition's path,
		 * not the surfacing early return */
		const deep = descendStairs(descendStairs(buildDungeonGameState(40, 20, 7)));
		const back = ascendStairs({ ...deep, turnsOnCurrentFloor: 80 });
		expect(back.floor).toBe(2);
		expect(back.turnsOnCurrentFloor).toBe(0);
	});

	it("generating a floor mid-retrace always gets an up staircase, floor 1 included", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		/* now at GOAL_FLOOR carrying nothing; simulate having taken the amulet */
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 1; floor--) {
			state = ascendStairs(state);
			expect(state.floor).toBe(floor);
			expect(state.stairs.direction).toBe("up");
			expect(state.status).toBe("playing");
		}
	});

	it("climbing back keeps the deepest floor; with the amulet those floors hold no gold", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 6; floor++) {
			state = descendStairs(state);
		}
		let emptyHanded = state;
		let carrying = { ...state, hasAmulet: true };
		let emptyHandedGold = 0;
		for (let floor = 5; floor >= 1; floor--) {
			emptyHanded = ascendStairs(emptyHanded);
			carrying = ascendStairs(carrying);
			expect(emptyHanded.deepestFloor).toBe(6);
			expect(carrying.deepestFloor).toBe(6);
			expect(carrying.goldPiles).toEqual([]);
			emptyHandedGold += emptyHanded.goldPiles.length;
		}
		/* without the amulet the same climb still finds gold */
		expect(emptyHandedGold).toBeGreaterThan(0);
	});

	it("a forced fall back to the deepest floor with the amulet does hold gold again", () => {
		let piles = 0;
		for (let seed = 1; seed <= 10; seed++) {
			const carrying = {
				...buildDungeonGameState(40, 20, seed),
				floor: 5,
				deepestFloor: 6,
				hasAmulet: true,
			};
			piles += descendStairs(carrying).goldPiles.length;
		}
		expect(piles).toBeGreaterThan(0);
	});

	it("surfacing from floor 1 with the amulet wins the run without generating a floor 0", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 1; floor--) {
			state = ascendStairs(state);
		}
		expect(state.floor).toBe(1);
		const surfaced = ascendStairs(state);
		expect(surfaced.floor).toBe(1);
		expect(surfaced.status).toBe("won");
		expect(surfaced.events.at(-1)).toEqual({
			type: "game-won",
			payload: {},
		});
	});

	it("surfacing from floor 1 without the amulet exits instead of winning", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		expect(deep.hasAmulet).toBe(false);
		const retracedFirstFloor = ascendStairs(deep);
		expect(retracedFirstFloor.status).toBe("playing");
		const surfaced = ascendStairs(retracedFirstFloor);
		expect(surfaced.status).toBe("exited");
		/* no event logged for an empty-handed exit */
		expect(surfaced.events).toEqual(retracedFirstFloor.events);
	});

	it("is deterministic, like descendStairs", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 3; floor++) {
			state = descendStairs(state);
		}
		expect(ascendStairs(state)).toEqual(ascendStairs(state));
	});
});
