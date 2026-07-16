import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import type { Action, Direction } from "./state.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

describe("pickups", () => {
	it("stepping onto a potion picks it up into inventory (not used yet)", () => {
		const potion = { x: 5, y: 1, kind: "heal-potion" as const };
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7,
			items: [potion],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(7); /* unchanged — picking up does not heal */
		expect(next.items).toEqual([]);
		expect(next.inventory).toEqual([{ kind: "heal-potion", quantity: 1 }]);
		expect(next.events).toEqual([
			{ type: "item-picked-up", payload: { kind: "heal-potion" } },
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
			items: [{ x: 5, y: 1, kind: "heal-potion" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.goldCollected).toBe(3);
		expect(next.inventory).toEqual([{ kind: "heal-potion", quantity: 1 }]);
	});

	it("picking up a second potion of the same kind stacks the quantity", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: "heal-potion" as const }],
			inventory: [{ kind: "heal-potion" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([{ kind: "heal-potion", quantity: 2 }]);
	});

	it("stepping onto the amulet's tile picks it up automatically", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const amuletTile = { x: start.player.x + 1, y: start.player.y };
		const state = { ...start, amulet: amuletTile };
		const next = advanceTurn(state, move("east"));
		expect(next.hasAmulet).toBe(true);
		expect(next.amulet).toBeUndefined();
		expect(next.events).toEqual([{ type: "amulet-obtained", payload: {} }]);
	});
});
