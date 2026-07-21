import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { Action, Enemy, GameState } from "../game/state.js";
import { createInitialBotMemory } from "./memory.js";
import { decideAction, STAGNATION_QUIT_TURNS } from "./policy.js";

const baseState = (): GameState => buildArenaGameState(9, 9, 1);

const enemyAt = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 2,
	awake: true,
	slowedTurnsRemaining: 0,
});

describe("decideAction", () => {
	it("waits while paralyzed instead of doing anything else", () => {
		const state = {
			...baseState(),
			paralyzedTurnsRemaining: 2,
			inventory: [{ kind: "heal-potion" as const, quantity: 1 }],
			playerHp: 1,
		};
		const { action } = decideAction(state, createInitialBotMemory());
		expect(action).toEqual({ type: "wait" });
	});

	it("uses a beneficial held item before moving", () => {
		const state = {
			...baseState(),
			playerHp: 1,
			inventory: [{ kind: "heal-potion" as const, quantity: 1 }],
		};
		const { action } = decideAction(state, createInitialBotMemory());
		expect(action).toEqual({
			type: "use-item",
			payload: { kind: "heal-potion" },
		});
	});

	it("attacks an adjacent enemy before continuing toward the goal", () => {
		const state = {
			...baseState(),
			items: [{ x: 8, y: 8, kind: "sword" as const }],
			enemies: [enemyAt(4, 3)],
		};
		const { action } = decideAction(state, createInitialBotMemory());
		expect(action).toEqual({ type: "move", payload: { direction: "north" } });
	});

	it("moves toward the nearest loot when nothing more urgent is going on", () => {
		const state = {
			...baseState(),
			items: [{ x: 4, y: 2, kind: "sword" as const }],
		};
		const { action, memory } = decideAction(state, createInitialBotMemory());
		expect(action).toEqual({ type: "move", payload: { direction: "north" } });
		expect(memory.goal).toEqual({ kind: "loot", x: 4, y: 2 });
	});

	it("gives up the run once stagnant for too many turns", () => {
		/* Wall off every neighbor of the player's tile so no move is ever
		 * possible — the goal (the staircase) is permanently unreachable, so
		 * nothing about the run can change turn after turn. */
		const arena = baseState();
		const isolatedTerrain = arena.terrain.map((column) => [...column]);
		const trapped = isolatedTerrain[arena.player.x];
		if (trapped === undefined) {
			throw new Error("unreachable: player.x is within terrain bounds");
		}
		trapped[arena.player.y - 1] = 1;
		trapped[arena.player.y + 1] = 1;
		const westColumn = isolatedTerrain[arena.player.x - 1];
		const eastColumn = isolatedTerrain[arena.player.x + 1];
		if (westColumn === undefined || eastColumn === undefined) {
			throw new Error("unreachable: player is not on the arena's edge");
		}
		westColumn[arena.player.y] = 1;
		eastColumn[arena.player.y] = 1;
		const state = { ...arena, terrain: isolatedTerrain };

		let memory = createInitialBotMemory();
		let action: Action | undefined;
		for (let turn = 0; turn < STAGNATION_QUIT_TURNS + 1; turn++) {
			({ action, memory } = decideAction(state, memory));
		}
		expect(action).toEqual({ type: "quit" });
	});

	it("keeps pursuing the same committed goal across turns instead of re-choosing it", () => {
		const state = {
			...baseState(),
			items: [{ x: 4, y: 1, kind: "sword" as const }],
		};
		const first = decideAction(state, createInitialBotMemory());
		const second = decideAction(state, first.memory);
		expect(second.memory.goal).toEqual({ kind: "loot", x: 4, y: 1 });
		expect(second.action).toEqual({
			type: "move",
			payload: { direction: "north" },
		});
	});
});
