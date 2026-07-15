import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { calculateEnemyCountForFloor } from "./balance.js";
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
			expect(state.items.length).toBe(2);
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

	it("keeps descending: 10 floors without breaking invariants", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let i = 0; i < 10; i++) {
			state = descendStairs(state);
			expect(state.floor).toBe(i + 2);
			expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
			expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
		}
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
