import { describe, expect, it } from "vitest";
import { at } from "../indexing.js";
import { createRng } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import { PLAYER_MAX_HP, ZOMBIE_MAX_HP } from "./balance.js";
import { buildFrameGrid } from "./frame.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import type { Action, Direction, Enemy, GameState } from "./state.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
});

describe("advanceTurn", () => {
	it("moves the player onto an adjacent floor tile", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(advanceTurn(state, move("north")).player).toEqual({ x: 2, y: 1 });
		expect(advanceTurn(state, move("south")).player).toEqual({ x: 2, y: 3 });
		expect(advanceTurn(state, move("west")).player).toEqual({ x: 1, y: 2 });
		expect(advanceTurn(state, move("east")).player).toEqual({ x: 3, y: 2 });
	});

	it("returns the state unchanged (same reference) on a blocked move", () => {
		const cramped = buildArenaGameState(3, 3, 1);
		for (const direction of ["north", "south", "west", "east"] as const) {
			expect(advanceTurn(cramped, move(direction))).toBe(cramped);
		}
	});

	it("moving into an enemy is a bump attack: damage, no movement, turn spent", () => {
		const state = { ...buildArenaGameState(5, 5, 1), enemies: [zombie(3, 2)] };
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual(state.player);
		expect(next.enemies).toEqual([{ ...zombie(3, 2), hp: ZOMBIE_MAX_HP - 1 }]);
		/* the turn was spent, so the surviving adjacent enemy hits back */
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
	});

	it("a killing blow removes the enemy", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			enemies: [{ ...zombie(3, 2), hp: 1 }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.enemies).toEqual([]);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([
			{ type: "enemy-hit", payload: { target: "zombie", damage: 1 } },
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("ignores moves once the run is over", () => {
		const state = buildArenaGameState(5, 5, 1);
		const dead = { ...state, status: "dead" as const };
		expect(advanceTurn(dead, move("east"))).toBe(dead);
		expect(advanceTurn(dead, { type: "wait" })).toBe(dead);
	});

	it("waiting passes the turn to the enemies (no cornered soft-lock)", () => {
		/* 9x3 arena: player (4,1) with an adjacent enemy — waiting must let
		 * the enemy act instead of freezing time forever */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)],
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.player).toEqual(state.player);
		expect(next.playerHp).toBe(state.playerHp - 1);

		/* waiting next to an enemy for the whole hp pool ends the run */
		let current: GameState = state;
		for (let i = 0; i < PLAYER_MAX_HP; i++) {
			current = advanceTurn(current, { type: "wait" });
		}
		expect(current.status).toBe("dead");
		expect(current.playerHp).toBe(0);
	});

	it("expands the explored grid as the player moves", () => {
		/* 30x5 arena: player starts at (15,2); view radius is 8 */
		const state = buildArenaGameState(30, 5, 1);
		expect(state.explored[24]?.[2]).toBe(false); /* distance 9: unseen */

		const moved = advanceTurn(state, move("east")); /* player (16,2) */
		expect(moved.explored[24]?.[2]).toBe(true); /* now in view */
		expect(moved.explored[15]?.[2]).toBe(true); /* old cells stay explored */
	});

	it("does not mutate the input state", () => {
		const state = buildArenaGameState(5, 5, 1);
		const snapshot = structuredClone(state);
		advanceTurn(state, move("east"));
		advanceTurn(state, { type: "quit" });
		expect(state).toEqual(snapshot);
	});

	it("keeps its invariants through fuzzed runs on real dungeons", () => {
		const actions: readonly Action[] = [
			move("north"),
			move("south"),
			move("west"),
			move("east"),
			{ type: "wait" },
		];
		for (let seed = 1; seed <= 5; seed++) {
			let state = buildDungeonGameState(40, 20, seed);
			const actionPicker = createRng(seed + 100);
			for (let turn = 0; turn < 300 && state.status === "playing"; turn++) {
				const picked = at(
					actions,
					actionPicker.getUniformInt(0, actions.length - 1),
				);
				state = advanceTurn(state, picked);

				expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
				expect(state.playerHp).toBeGreaterThanOrEqual(0);
				expect(state.playerHp).toBeLessThanOrEqual(PLAYER_MAX_HP);
				for (const enemy of state.enemies) {
					/* an enemy must never share the player's tile */
					expect(enemy.x === state.player.x && enemy.y === state.player.y).toBe(
						false,
					);
					expect(enemy.hp).toBeGreaterThan(0);
				}
				/* rendering the frame must never throw or change shape */
				const grid = buildFrameGrid(state);
				expect(grid.length).toBe(state.height);
			}
		}
	});

	it("stepping onto a potion drinks it: capped heal, item consumed", () => {
		const potion = { x: 5, y: 1, kind: "potion" as const };
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7 /* missing 3, potion heals 5: the cap must win */,
			items: [potion],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(PLAYER_MAX_HP);
		expect(next.items).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "potion", amount: 3 } },
		]);
	});

	it("a potion picked up at full health is wasted (amount 0)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: "potion" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.items).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "potion", amount: 0 } },
		]);
	});

	it("moving onto the staircase descends to the next floor", () => {
		/* teleport the stairs right next to the player (room centers always
		 * have floor neighbors), then step east onto them */
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			playerHp: 4,
			stairs: { x: start.player.x + 1, y: start.player.y },
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(2);
		expect(next.playerHp).toBe(4); /* the new floor's enemies wait a turn */
		expect(next.events).toEqual([
			{ type: "floor-descended", payload: { floor: 2 } },
		]);
		expect(next.terrain).not.toEqual(state.terrain);
	});

	it("an enemy standing on the staircase gets bump-attacked, not skipped past", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const stairs = { x: start.player.x + 1, y: start.player.y };
		const state = {
			...start,
			stairs,
			enemies: [{ ...stairs, kind: "zombie" as const, hp: ZOMBIE_MAX_HP }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(1);
		expect(next.enemies[0]?.hp).toBe(ZOMBIE_MAX_HP - 1);
	});

	it("quit marks the game as exited without touching the rest", () => {
		const state = buildArenaGameState(5, 5, 1);
		const exited = advanceTurn(state, { type: "quit" });
		expect(exited.status).toBe("exited");
		expect(exited.player).toEqual(state.player);
		expect(exited.terrain).toBe(state.terrain);
	});

	it("save marks the game as suspended; enemies get no turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)] /* adjacent — would hit if enemies acted */,
		};
		const suspended = advanceTurn(state, { type: "save" });
		expect(suspended.status).toBe("suspended");
		expect(suspended.playerHp).toBe(state.playerHp);
		expect(suspended.enemies).toEqual(state.enemies);
		/* saving is not a game-world event — the log stays untouched */
		expect(suspended.events).toEqual(state.events);

		const dead = { ...state, status: "dead" as const };
		expect(advanceTurn(dead, { type: "save" })).toBe(dead);
	});
});
