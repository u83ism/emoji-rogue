import { describe, expect, it } from "vitest";
import { encodePointKey } from "../../pointkey.js";
import {
	calculateEnemyCountForFloor,
	FOOD_COUNT_PER_FLOOR,
	GOAL_FLOOR,
	MONSTER_HOUSE_ENEMY_COUNT,
	POTION_COUNT_PER_FLOOR,
} from "../balance.js";
import { buildDungeonGameState } from "../initialState.js";
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

	it("resets turnsOnCurrentFloor to 0", () => {
		const loitered = descendStairs({ ...start, turnsOnCurrentFloor: 150 });
		expect(loitered.turnsOnCurrentFloor).toBe(0);
	});

	it("spawns both zombies and bats", () => {
		/* a monster house room, if it rolled on this floor, adds up to
		 * MONSTER_HOUSE_ENEMY_COUNT more zombies/bats on top of the base count */
		for (const state of [start, below]) {
			const kinds = state.enemies.map((enemy) => enemy.kind);
			const zombieCount = kinds.filter((kind) => kind === "zombie").length;
			const batCount = kinds.filter((kind) => kind === "bat").length;
			expect(zombieCount).toBeGreaterThanOrEqual(3);
			expect(zombieCount).toBeLessThanOrEqual(3 + MONSTER_HOUSE_ENEMY_COUNT);
			expect(batCount).toBeGreaterThanOrEqual(2);
			expect(batCount).toBeLessThanOrEqual(2 + MONSTER_HOUSE_ENEMY_COUNT);
		}
	});

	it("places everything on distinct floor tiles", () => {
		for (const state of [start, below]) {
			/* potions and food rations are guaranteed; the sword is a per-floor chance (0 or 1) */
			expect(
				state.items.filter((item) => item.kind === "heal-potion").length,
			).toBe(POTION_COUNT_PER_FLOOR);
			expect(state.items.filter((item) => item.kind === "food").length).toBe(
				FOOD_COUNT_PER_FLOOR,
			);
			expect(
				state.items.filter((item) => item.kind === "sword").length,
			).toBeLessThanOrEqual(1);
			expect(
				state.items.filter((item) => item.kind === "shield").length,
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
			expect(state.goldPiles.length).toBe(3);
			for (const pile of state.goldPiles) {
				expect(pile.amount).toBeGreaterThanOrEqual(2);
				expect(pile.amount).toBeLessThanOrEqual(20);
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

	it("spawns more enemies on deeper floors, matching the scaling formula", () => {
		/* a monster house room, if it rolled on this floor, adds up to
		 * MONSTER_HOUSE_ENEMY_COUNT more zombies/bats on top of the scaled count */
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const kinds = state.enemies.map((enemy) => enemy.kind);
			const zombieBase = calculateEnemyCountForFloor("zombie", floor);
			const batBase = calculateEnemyCountForFloor("bat", floor);
			const zombieCount = kinds.filter((kind) => kind === "zombie").length;
			const batCount = kinds.filter((kind) => kind === "bat").length;
			expect(zombieCount).toBeGreaterThanOrEqual(zombieBase);
			expect(zombieCount).toBeLessThanOrEqual(
				zombieBase + MONSTER_HOUSE_ENEMY_COUNT,
			);
			expect(batCount).toBeGreaterThanOrEqual(batBase);
			expect(batCount).toBeLessThanOrEqual(batBase + MONSTER_HOUSE_ENEMY_COUNT);
		}
	});
});
describe("ascendStairs", () => {
	it("is the mirror of descendStairs: decrements the floor and regenerates it with an up staircase", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		const back = ascendStairs({ ...deep, playerHp: 5 });
		expect(back.floor).toBe(1);
		expect(back.status).toBe("exited"); /* no amulet — see below */
	});

	it("resets turnsOnCurrentFloor to 0 on a mid-retrace ascent", () => {
		/* floor 3, so ascending lands on floor 2 — buildFloorTransition's path,
		 * not the floor-1 early return */
		const deep = descendStairs(descendStairs(buildDungeonGameState(40, 20, 7)));
		const back = ascendStairs({ ...deep, turnsOnCurrentFloor: 80 });
		expect(back.floor).toBe(2);
		expect(back.turnsOnCurrentFloor).toBe(0);
	});

	it("generating a floor mid-retrace always gets an up staircase", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		/* now at GOAL_FLOOR carrying nothing; simulate having taken the amulet */
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 2; floor--) {
			state = ascendStairs(state);
			expect(state.floor).toBe(floor);
			expect(state.stairs.direction).toBe("up");
			expect(state.status).toBe("playing");
		}
	});

	it("surfacing with the amulet wins the run without generating a floor 0", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		state = { ...state, hasAmulet: true };
		for (let floor = GOAL_FLOOR - 1; floor >= 2; floor--) {
			state = ascendStairs(state);
		}
		const surfaced = ascendStairs(state);
		expect(surfaced.status).toBe("won");
		expect(surfaced.events.at(-1)).toEqual({
			type: "game-won",
			payload: {},
		});
	});

	it("surfacing without the amulet exits instead of winning", () => {
		const deep = descendStairs(buildDungeonGameState(40, 20, 7));
		expect(deep.hasAmulet).toBe(false);
		const surfaced = ascendStairs(deep);
		expect(surfaced.status).toBe("exited");
		expect(surfaced.events).toEqual(deep.events); /* no event logged */
	});

	it("is deterministic, like descendStairs", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 3; floor++) {
			state = descendStairs(state);
		}
		expect(ascendStairs(state)).toEqual(ascendStairs(state));
	});
});
