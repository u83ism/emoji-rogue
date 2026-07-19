import { describe, expect, it } from "vitest";
import { at } from "../indexing.js";
import { createRng } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import {
	GOAL_FLOOR,
	PLAYER_MAX_FOOD,
	PLAYER_MAX_HP,
	WINDS_OF_KRON_EVICTION_TURNS,
	WINDS_OF_KRON_WARNING_TURNS,
	ZOMBIE_MAX_HP,
} from "./balance.js";
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
	awake: true,
	slowedTurnsRemaining: 0,
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
		expect(next.playerExperience).toBeGreaterThan(state.playerExperience);
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

	it("detectMonstersTurnsRemaining reaches 0 and fires detect-monsters-faded", () => {
		let current: GameState = {
			...buildArenaGameState(9, 9, 1),
			detectMonstersTurnsRemaining: 1,
		};
		current = advanceTurn(current, { type: "wait" });
		expect(current.detectMonstersTurnsRemaining).toBe(0);
		expect(
			current.events.some((event) => event.type === "detect-monsters-faded"),
		).toBe(true);
	});

	it("fires winds-of-kron-warning after lingering on one floor", () => {
		const state: GameState = {
			...buildArenaGameState(9, 9, 1),
			turnsOnCurrentFloor: WINDS_OF_KRON_WARNING_TURNS - 1,
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.turnsOnCurrentFloor).toBe(WINDS_OF_KRON_WARNING_TURNS);
		expect(
			next.events.some((event) => event.type === "winds-of-kron-warning"),
		).toBe(true);
	});

	it("forcibly descends and resets turnsOnCurrentFloor once the eviction threshold is reached", () => {
		/* descendStairs needs digger-sized dimensions, unlike the tiny arena fixture */
		const state: GameState = {
			...buildDungeonGameState(40, 20, 7),
			turnsOnCurrentFloor: WINDS_OF_KRON_EVICTION_TURNS - 1,
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.floor).toBe(state.floor + 1);
		expect(next.turnsOnCurrentFloor).toBe(0);
		expect(
			next.events.some((event) => event.type === "winds-of-kron-eviction"),
		).toBe(true);
	});

	it("paralyzedTurnsRemaining reaches 0 and fires paralysis-faded", () => {
		let current: GameState = {
			...buildArenaGameState(9, 9, 1),
			paralyzedTurnsRemaining: 1,
		};
		current = advanceTurn(current, { type: "wait" });
		expect(current.paralyzedTurnsRemaining).toBe(0);
		expect(
			current.events.some((event) => event.type === "paralysis-faded"),
		).toBe(true);
	});

	it("a paralyzed player cannot move — the position is unchanged but the turn still passes", () => {
		const state: GameState = {
			...buildArenaGameState(9, 9, 1),
			paralyzedTurnsRemaining: 3,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual(state.player);
		expect(next.paralyzedTurnsRemaining).toBe(2);
		expect(next.playerFood).toBe(state.playerFood - 1); /* a turn passed */
	});

	it("a paralyzed player cannot use an item — inventory is untouched but the turn still passes", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			paralyzedTurnsRemaining: 3,
			inventory: [{ itemId: 1, kind: "heal-potion" } as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual(state.inventory);
		expect(next.paralyzedTurnsRemaining).toBe(2);
		expect(next.playerFood).toBe(state.playerFood - 1); /* a turn passed */
	});

	it("a paralyzed player cannot drop an item — inventory is untouched but the turn still passes", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			paralyzedTurnsRemaining: 3,
			inventory: [{ itemId: 1, kind: "heal-potion" } as const],
		};
		const next = advanceTurn(state, {
			type: "drop-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual(state.inventory);
		expect(next.paralyzedTurnsRemaining).toBe(2);
		expect(next.playerFood).toBe(state.playerFood - 1); /* a turn passed */
	});

	it("dropping a held item moves it from inventory onto the player's tile and spends a turn", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			inventory: [{ itemId: 1, kind: "heal-potion" } as const],
		};
		const next = advanceTurn(state, {
			type: "drop-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.items).toEqual([
			{ x: state.player.x, y: state.player.y, kind: "heal-potion" },
		]);
		expect(next.playerFood).toBe(state.playerFood - 1); /* a turn passed */
	});

	it("dropping an itemId not held spends no turn", () => {
		const state = { ...buildArenaGameState(9, 9, 1), inventory: [] };
		const next = advanceTurn(state, {
			type: "drop-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("enemies still act while the player is paralyzed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			paralyzedTurnsRemaining: 3,
			enemies: [zombie(5, 1)],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp - 1);
	});

	it("moving while confused ignores the intended direction in favor of a random one", () => {
		/* at seed 1, the confused roll always picks north regardless of intent */
		const state: GameState = {
			...buildArenaGameState(9, 9, 1),
			confusedTurnsRemaining: 5,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: state.player.x, y: state.player.y - 1 });
		expect(next.confusedTurnsRemaining).toBe(4);
	});

	it("a confused stumble into a wall still spends the turn (unlike a normal wall bump)", () => {
		/* seed 1's confused roll picks north; placed just south of the wall so
		 * that roll bumps into it instead of moving */
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			player: { x: 2, y: 1 },
			confusedTurnsRemaining: 5,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual(state.player); /* did not move */
		expect(next).not.toBe(state); /* but the turn was still spent */
		expect(next.confusedTurnsRemaining).toBe(4);
	});

	it("confusedTurnsRemaining reaches 0 and fires confusion-faded", () => {
		let current: GameState = {
			...buildArenaGameState(9, 9, 1),
			confusedTurnsRemaining: 1,
		};
		current = advanceTurn(current, { type: "wait" });
		expect(current.confusedTurnsRemaining).toBe(0);
		expect(
			current.events.some((event) => event.type === "confusion-faded"),
		).toBe(true);
	});

	it("blindTurnsRemaining reaches 0 and fires blindness-faded", () => {
		let current: GameState = {
			...buildArenaGameState(9, 9, 1),
			blindTurnsRemaining: 1,
		};
		current = advanceTurn(current, { type: "wait" });
		expect(current.blindTurnsRemaining).toBe(0);
		expect(
			current.events.some((event) => event.type === "blindness-faded"),
		).toBe(true);
	});

	it("shrinks explored-tile growth while blind (reduced view radius)", () => {
		/* buildArenaGameState pre-explores everything reachable at full radius,
		 * so blank the explored grid first to isolate this one move's growth.
		 * Exploration only re-derives on move, not on wait. */
		const base = buildArenaGameState(15, 15, 1);
		const blankExplored = base.explored.map((column) =>
			column.map(() => false),
		);

		const sighted = advanceTurn(
			{ ...base, explored: blankExplored },
			move("east"),
		);
		const blinded = advanceTurn(
			{ ...base, explored: blankExplored, blindTurnsRemaining: 5 },
			move("east"),
		);

		const countExplored = (state: GameState): number =>
			state.explored.reduce(
				(total, column) => total + column.filter(Boolean).length,
				0,
			);
		expect(countExplored(blinded)).toBeLessThan(countExplored(sighted));
	});

	it("every turn-consuming action ticks hunger down by one", () => {
		const waited = advanceTurn(buildArenaGameState(9, 3, 1), { type: "wait" });
		expect(waited.playerFood).toBe(PLAYER_MAX_FOOD - 1);

		const moved = advanceTurn(buildArenaGameState(9, 3, 1), move("east"));
		expect(moved.playerFood).toBe(PLAYER_MAX_FOOD - 1);

		const usedItem = advanceTurn(
			{
				...buildArenaGameState(9, 3, 1),
				inventory: [{ itemId: 1, kind: "heal-potion" } as const],
			},
			{ type: "use-item", payload: { itemId: 1 } },
		);
		expect(usedItem.playerFood).toBe(PLAYER_MAX_FOOD - 1);
	});

	it("moving onto the staircase descends to the next floor", () => {
		/* teleport the stairs right next to the player (room centers always
		 * have floor neighbors), then step east onto them */
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			playerHp: 4,
			stairs: {
				x: start.player.x + 1,
				y: start.player.y,
				direction: "down" as const,
			},
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(2);
		expect(next.playerHp).toBe(4); /* the new floor's enemies wait a turn */
		expect(next.events).toEqual([
			{ type: "floor-descended", payload: { floor: 2 } },
		]);
		expect(next.terrain).not.toEqual(state.terrain);
	});

	it("reaching GOAL_FLOOR through the stairs generates it with an up staircase and the amulet, no victory yet", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			floor: GOAL_FLOOR - 1,
			stairs: {
				x: start.player.x + 1,
				y: start.player.y,
				direction: "down" as const,
			},
		};
		const next = advanceTurn(state, move("east"));
		expect(next.status).toBe("playing");
		expect(next.floor).toBe(GOAL_FLOOR);
		expect(next.stairs.direction).toBe("up");
		expect(next.amulet).not.toBeUndefined();
		expect(next.hasAmulet).toBe(false);
		expect(next.events).toEqual([
			{ type: "floor-descended", payload: { floor: GOAL_FLOOR } },
		]);
	});

	it("falling through a trapdoor into GOAL_FLOOR also gets the amulet and an up staircase", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			floor: GOAL_FLOOR - 1,
			traps: [
				{ x: start.player.x + 1, y: start.player.y, kind: "trapdoor" as const },
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.status).toBe("playing");
		expect(next.floor).toBe(GOAL_FLOOR);
		expect(next.stairs.direction).toBe("up");
		expect(next.amulet).not.toBeUndefined();
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "trapdoor", damage: 0 } },
			{ type: "floor-descended", payload: { floor: GOAL_FLOOR } },
		]);
	});

	it("surfacing without the amulet ends the run as exited, not won", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			floor: 1,
			hasAmulet: false,
			stairs: {
				x: start.player.x + 1,
				y: start.player.y,
				direction: "up" as const,
			},
		};
		const next = advanceTurn(state, move("east"));
		expect(next.status).toBe("exited");
	});

	it("surfacing with the amulet wins the run", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			floor: 1,
			hasAmulet: true,
			stairs: {
				x: start.player.x + 1,
				y: start.player.y,
				direction: "up" as const,
			},
		};
		const next = advanceTurn(state, move("east"));
		expect(next.status).toBe("won");
		expect(next.events).toEqual([{ type: "game-won", payload: {} }]);
	});

	it("ignores moves once the run has been won", () => {
		const state = { ...buildArenaGameState(5, 5, 1), status: "won" as const };
		expect(advanceTurn(state, move("east"))).toBe(state);
	});

	it("an enemy standing on the staircase gets bump-attacked, not skipped past", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const stairsPosition = { x: start.player.x + 1, y: start.player.y };
		const state = {
			...start,
			stairs: { ...stairsPosition, direction: "down" as const },
			enemies: [
				{
					...stairsPosition,
					kind: "zombie" as const,
					hp: ZOMBIE_MAX_HP,
					awake: true,
					slowedTurnsRemaining: 0,
				},
			],
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
