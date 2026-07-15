import { describe, expect, it } from "vitest";
import { at } from "../indexing.js";
import { createRng } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import {
	GOAL_FLOOR,
	PLAYER_MAX_FOOD,
	PLAYER_MAX_HP,
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

	it("stepping onto a potion picks it up into inventory (not used yet)", () => {
		const potion = { x: 5, y: 1, kind: "potion" as const };
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7,
			items: [potion],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(7); /* unchanged — picking up does not heal */
		expect(next.items).toEqual([]);
		expect(next.inventory).toEqual([{ kind: "potion", quantity: 1 }]);
		expect(next.events).toEqual([
			{ type: "item-picked-up", payload: { kind: "potion" } },
		]);
	});

	it("stepping onto a gold pile collects it immediately (no inventory slot)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			goldPiles: [{ x: 5, y: 1, amount: 7 }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.goldPiles).toEqual([]);
		expect(next.goldCollected).toBe(state.goldCollected + 7);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "gold-collected", payload: { amount: 7 } },
		]);
	});

	it("collecting gold and an item on the same tile does both", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			goldPiles: [{ x: 5, y: 1, amount: 3 }],
			items: [{ x: 5, y: 1, kind: "potion" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.goldCollected).toBe(3);
		expect(next.inventory).toEqual([{ kind: "potion", quantity: 1 }]);
	});

	it("stepping onto a hidden trap springs it: damage dealt, trap consumed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.traps).toEqual([]);
		expect(next.playerHp).toBe(state.playerHp - 2);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
		]);
	});

	it("a fatal trap ends the run without a bonus enemy hit the same turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 2,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
			enemies: [zombie(6, 1)] /* would be adjacent after the move */,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
			{ type: "player-died", payload: { by: "trap" } },
		]);
	});

	it("picking up a second potion of the same kind stacks the quantity", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: "potion" as const }],
			inventory: [{ kind: "potion" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([{ kind: "potion", quantity: 2 }]);
	});

	it("using a held potion drinks it: capped heal, one consumed from inventory", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7 /* missing 3, potion heals 5: the cap must win */,
			inventory: [{ kind: "potion" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "potion" },
		});
		expect(next.playerHp).toBe(PLAYER_MAX_HP);
		expect(next.inventory).toEqual([{ kind: "potion", quantity: 1 }]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "potion", amount: 3 } },
		]);
	});

	it("using the last potion at full health wastes it (amount 0) and empties the stack", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "potion" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "potion" },
		});
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-healed", payload: { by: "potion", amount: 0 } },
		]);
	});

	it("using an item spends a turn: adjacent enemies still get to act", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "potion" as const, quantity: 1 }],
			enemies: [zombie(5, 1)] /* adjacent to the player */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "potion" },
		});
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events.some((event) => event.type === "player-hit")).toBe(true);
	});

	it("using an item kind with none held is a no-op (same reference, no turn spent)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)] /* adjacent — would hit if enemies acted */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "potion" },
		});
		expect(next).toBe(state);
	});

	it("using a held sword permanently raises playerAttackDamage instead of healing", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "sword" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "sword" },
		});
		expect(next.playerAttackDamage).toBe(state.playerAttackDamage + 1);
		expect(next.playerHp).toBe(state.playerHp); /* swords don't heal */
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
		]);
	});

	it("using a second sword stacks the attack bonus", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerAttackDamage: 2 /* as if a first sword was already used */,
			inventory: [{ kind: "sword" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "sword" },
		});
		expect(next.playerAttackDamage).toBe(3);
	});

	it("using a held shield permanently raises playerDefense instead of healing", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "shield" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "shield" },
		});
		expect(next.playerDefense).toBe(state.playerDefense + 1);
		expect(next.playerHp).toBe(state.playerHp); /* shields don't heal */
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "armor-equipped", payload: { kind: "shield", bonus: 1 } },
		]);
	});

	it("using a second shield stacks the defense bonus", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerDefense: 1 /* as if a first shield was already used */,
			inventory: [{ kind: "shield" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "shield" },
		});
		expect(next.playerDefense).toBe(2);
	});

	it("using a held food ration restores food up to the cap, one consumed from inventory", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerFood: 70 /* missing 30, a ration restores 50: the cap must win */,
			inventory: [{ kind: "food" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "food" },
		});
		/* restored to the cap (100), then the same turn's hunger tick takes one back */
		expect(next.playerFood).toBe(PLAYER_MAX_FOOD - 1);
		expect(next.inventory).toEqual([{ kind: "food", quantity: 1 }]);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: 30 } },
		]);
	});

	it("using the last food ration at full satiety wastes it (amount 0) and empties the stack", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "food" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "food" },
		});
		/* already full, so eating restores nothing; the turn's hunger tick still applies */
		expect(next.playerFood).toBe(state.playerFood - 1);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "player-ate", payload: { amount: 0 } },
		]);
	});

	it("using a held poison potion damages the player and identifies that kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: PLAYER_MAX_HP,
			inventory: [{ kind: "poison" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "poison" },
		});
		expect(next.playerHp).toBe(PLAYER_MAX_HP - 4);
		expect(next.inventory).toEqual([{ kind: "poison", quantity: 1 }]);
		expect(next.identifiedPotionKinds).toEqual(["poison"]);
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { damage: 4 } },
		]);
	});

	it("a fatal poison potion ends the run without a bonus enemy hit the same turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 3,
			inventory: [{ kind: "poison" as const, quantity: 1 }],
			enemies: [zombie(5, 1)] /* adjacent to the player at (4,1) */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "poison" },
		});
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-poisoned", payload: { damage: 4 } },
			{ type: "player-died", payload: { by: "poison" } },
		]);
	});

	it("using a held strength potion permanently raises playerAttackDamage and identifies that kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "strength" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "strength" },
		});
		expect(next.playerAttackDamage).toBe(state.playerAttackDamage + 1);
		expect(next.inventory).toEqual([{ kind: "strength", quantity: 1 }]);
		expect(next.identifiedPotionKinds).toEqual(["strength"]);
		expect(next.events).toEqual([
			{ type: "player-strengthened", payload: { bonus: 1 } },
		]);
	});

	it("drinking either potion kind only identifies that kind, not the other", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "potion" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "potion" },
		});
		expect(next.identifiedPotionKinds).toEqual(["potion"]);
	});

	it("using a held scroll teleports the player, consumes the scroll, and consumes rng", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "scroll" as const, quantity: 2 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "scroll" },
		});
		expect(next.inventory).toEqual([{ kind: "scroll", quantity: 1 }]);
		expect(next.rng).not.toEqual(state.rng);
		expect(next.events).toEqual([
			{
				type: "player-teleported",
				payload: { x: next.player.x, y: next.player.y },
			},
		]);
	});

	it("is deterministic: the same state always teleports to the same tile", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "scroll" as const, quantity: 1 }],
		};
		const action = { type: "use-item", payload: { kind: "scroll" } } as const;
		expect(advanceTurn(state, action)).toEqual(advanceTurn(state, action));
	});

	it("never teleports onto a tile occupied by an enemy", () => {
		let state = buildDungeonGameState(40, 20, 42);
		state = {
			...state,
			inventory: [{ kind: "scroll" as const, quantity: 1 }],
		};
		for (let attempt = 0; attempt < 20; attempt++) {
			const next = advanceTurn(state, {
				type: "use-item",
				payload: { kind: "scroll" },
			});
			for (const enemy of next.enemies) {
				expect(enemy.x === next.player.x && enemy.y === next.player.y).toBe(
					false,
				);
			}
			state = { ...next, inventory: state.inventory };
		}
	});

	it("using a held mapping scroll reveals the entire floor as explored", () => {
		const state = buildDungeonGameState(40, 20, 7);
		const withScroll = {
			...state,
			inventory: [{ kind: "mapping" as const, quantity: 1 }],
		};
		const next = advanceTurn(withScroll, {
			type: "use-item",
			payload: { kind: "mapping" },
		});
		expect(next.inventory).toEqual([]);
		expect(next.player).toEqual(
			state.player,
		); /* mapping does not move the player */
		expect(next.events).toEqual([{ type: "floor-mapped", payload: {} }]);
		for (let x = 0; x < next.width; x++) {
			for (let y = 0; y < next.height; y++) {
				expect(next.explored[x]?.[y]).toBe(true);
			}
		}
	});

	it("using a held identify scroll identifies the first unidentified potion kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "identify" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify" },
		});
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["potion"]);
		expect(next.events).toEqual([
			{ type: "potion-identified", payload: { kind: "potion" } },
		]);
	});

	it("identifying repeatedly reveals one potion kind per scroll, in order", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "identify" as const, quantity: 3 }],
		};
		const afterFirst = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify" },
		});
		expect(afterFirst.identifiedPotionKinds).toEqual(["potion"]);

		const afterSecond = advanceTurn(afterFirst, {
			type: "use-item",
			payload: { kind: "identify" },
		});
		expect(afterSecond.identifiedPotionKinds).toEqual(["potion", "poison"]);

		const afterThird = advanceTurn(afterSecond, {
			type: "use-item",
			payload: { kind: "identify" },
		});
		expect(afterThird.identifiedPotionKinds).toEqual([
			"potion",
			"poison",
			"strength",
		]);
	});

	it("is a no-op (same reference, no turn spent) once everything is already identified", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			identifiedPotionKinds: ["potion", "poison", "strength"] as const,
			inventory: [{ kind: "identify" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify" },
		});
		expect(next).toBe(state);
	});

	it("every turn-consuming action ticks hunger down by one", () => {
		const waited = advanceTurn(buildArenaGameState(9, 3, 1), { type: "wait" });
		expect(waited.playerFood).toBe(PLAYER_MAX_FOOD - 1);

		const moved = advanceTurn(buildArenaGameState(9, 3, 1), move("east"));
		expect(moved.playerFood).toBe(PLAYER_MAX_FOOD - 1);

		const usedItem = advanceTurn(
			{
				...buildArenaGameState(9, 3, 1),
				inventory: [{ kind: "potion" as const, quantity: 1 }],
			},
			{ type: "use-item", payload: { kind: "potion" } },
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

	it("reaching GOAL_FLOOR through the stairs ends the run in victory", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			floor: GOAL_FLOOR - 1,
			stairs: { x: start.player.x + 1, y: start.player.y },
		};
		const next = advanceTurn(state, move("east"));
		expect(next.status).toBe("won");
		expect(next.floor).toBe(GOAL_FLOOR);
		expect(next.events).toEqual([
			{ type: "game-won", payload: { floor: GOAL_FLOOR } },
		]);
	});

	it("ignores moves once the run has been won", () => {
		const state = { ...buildArenaGameState(5, 5, 1), status: "won" as const };
		expect(advanceTurn(state, move("east"))).toBe(state);
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
