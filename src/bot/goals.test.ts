import { describe, expect, it } from "vitest";
import { PLAYER_HUNGER_WARNING_THRESHOLD } from "../game/balance.js";
import { buildArenaGameState } from "../game/initialState.js";
import type { GameState, Item } from "../game/state.js";
import { chooseGoal, isGoalStillValid } from "./goals.js";

const baseState = (): GameState => buildArenaGameState(9, 9, 1);

const swordAt = (x: number, y: number): Item => ({
	x,
	y,
	kind: "sword",
	identity: { itemId: 1, cursed: false, attackBonus: 1 },
});

const armorAt = (x: number, y: number): Item => ({
	x,
	y,
	kind: "armor",
	identity: { itemId: 2, cursed: false, defenseBonus: 1, rustProtected: false },
});

const foodAt = (x: number, y: number): Item => ({ x, y, kind: "food" });

describe("chooseGoal", () => {
	it("targets the nearest item when loot is present", () => {
		const state = { ...baseState(), items: [swordAt(6, 4)] };
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 6,
			y: 4,
		});
	});

	it("targets the nearest gold pile when there is no item closer", () => {
		const state = {
			...baseState(),
			goldPiles: [{ x: 3, y: 4, amount: 5 }],
		};
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 3,
			y: 4,
		});
	});

	it("targets the amulet when present", () => {
		const state = { ...baseState(), amulet: { x: 7, y: 7 } };
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 7,
			y: 7,
		});
	});

	it("falls back to the staircase once there is nothing left to collect", () => {
		const state = baseState();
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "stairs",
			x: state.stairs.x,
			y: state.stairs.y,
		});
	});

	it("excludes blacklisted tiles from consideration", () => {
		const state = {
			...baseState(),
			items: [swordAt(6, 4), armorAt(5, 3)],
		};
		const blacklist = new Set(["6,4"]);
		expect(chooseGoal(state, blacklist)).toEqual({
			kind: "loot",
			x: 5,
			y: 3,
		});
	});

	it("prioritizes a food item over closer non-food loot once hungry with none held", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD,
			items: [swordAt(3, 3), foodAt(7, 7)],
		};
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 7,
			y: 7,
		});
	});

	it("does not prioritize food when some is already held", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD,
			inventory: [{ itemId: 10, kind: "food" as const }],
			items: [swordAt(3, 3), foodAt(7, 7)],
		};
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 3,
			y: 3,
		});
	});

	it("does not prioritize food while satiety is above the warning threshold", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD + 1,
			items: [swordAt(3, 3), foodAt(7, 7)],
		};
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "loot",
			x: 3,
			y: 3,
		});
	});

	it("does not target a loot item once the inventory is already full", () => {
		const state = {
			...baseState(),
			inventory: Array.from({ length: 20 }, (_, index) => ({
				itemId: index,
				kind: "food" as const,
			})),
			items: [swordAt(6, 4)],
		};
		expect(chooseGoal(state, new Set())).toEqual({
			kind: "stairs",
			x: state.stairs.x,
			y: state.stairs.y,
		});
	});
});

describe("isGoalStillValid", () => {
	it("is true for a loot goal whose tile still has loot", () => {
		const state = { ...baseState(), items: [swordAt(6, 4)] };
		expect(isGoalStillValid(state, { kind: "loot", x: 6, y: 4 })).toBe(true);
	});

	it("is false for a loot goal whose item was already collected", () => {
		const state = baseState();
		expect(isGoalStillValid(state, { kind: "loot", x: 6, y: 4 })).toBe(false);
	});

	it("is always true for a stairs goal", () => {
		const state = baseState();
		expect(isGoalStillValid(state, { kind: "stairs", x: 0, y: 0 })).toBe(true);
	});
});
