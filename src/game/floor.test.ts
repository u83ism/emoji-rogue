import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { calculateEnemyCountForFloor, GOAL_FLOOR } from "./balance.js";
import { descendStairs } from "./floor.js";
import { buildDungeonGameState } from "./initialState.js";

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

	it("spawns both zombies and bats", () => {
		for (const state of [start, below]) {
			const kinds = state.enemies.map((enemy) => enemy.kind);
			expect(kinds.filter((kind) => kind === "zombie").length).toBe(3);
			expect(kinds.filter((kind) => kind === "bat").length).toBe(2);
		}
	});

	it("places everything on distinct floor tiles", () => {
		for (const state of [start, below]) {
			/* potions are guaranteed; the sword is a per-floor chance (0 or 1) */
			expect(state.items.filter((item) => item.kind === "potion").length).toBe(
				2,
			);
			expect(
				state.items.filter((item) => item.kind === "sword").length,
			).toBeLessThanOrEqual(1);
			const occupied = new Set([
				encodePointKey(state.player.x, state.player.y),
			]);
			const spawned = [state.stairs, ...state.enemies, ...state.items];
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

	it("reaching GOAL_FLOOR ends the run in victory instead of generating a new floor", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		expect(state.floor).toBe(GOAL_FLOOR);
		expect(state.status).toBe("won");
		expect(state.events.at(-1)).toEqual({
			type: "game-won",
			payload: { floor: GOAL_FLOOR },
		});
	});

	it("calling descendStairs again past victory stays won (defensive clamp)", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= GOAL_FLOOR; floor++) {
			state = descendStairs(state);
		}
		const again = descendStairs(state);
		expect(again.floor).toBe(GOAL_FLOOR);
		expect(again.status).toBe("won");
	});

	it("spawns more enemies on deeper floors, matching the scaling formula", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let floor = 2; floor <= 7; floor++) {
			state = descendStairs(state);
			const kinds = state.enemies.map((enemy) => enemy.kind);
			expect(kinds.filter((kind) => kind === "zombie").length).toBe(
				calculateEnemyCountForFloor("zombie", floor),
			);
			expect(kinds.filter((kind) => kind === "bat").length).toBe(
				calculateEnemyCountForFloor("bat", floor),
			);
		}
	});
});

describe("sword spawning", () => {
	it("spawns a sword on some floors and not others (independent per-floor roll)", () => {
		const outcomes = Array.from({ length: 20 }, (_, index) =>
			buildDungeonGameState(40, 20, index + 1).items.some(
				(item) => item.kind === "sword",
			),
		);
		expect(outcomes.some((spawned) => spawned)).toBe(true);
		expect(outcomes.some((spawned) => !spawned)).toBe(true);
	});

	it("never spawns more than one sword on a floor", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const swordCount = buildDungeonGameState(40, 20, seed).items.filter(
				(item) => item.kind === "sword",
			).length;
			expect(swordCount).toBeLessThanOrEqual(1);
		}
	});
});
