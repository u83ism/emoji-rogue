import { describe, expect, it } from "vitest";
import { PLAYER_HUNGER_WARNING_THRESHOLD } from "../game/balance.js";
import { buildArenaGameState } from "../game/initialState.js";
import type { GameState, HeldItem } from "../game/state.js";
import { decideItemToUse } from "./itemUsePolicy.js";

const baseState = (): GameState => buildArenaGameState(5, 5, 1);

const consumable = (itemId: number, kind: HeldItem["kind"]): HeldItem =>
	({ itemId, kind }) as HeldItem;

const armor = (
	itemId: number,
	overrides: {
		readonly equipped?: boolean;
		readonly rustProtected?: boolean;
	} = {},
): HeldItem => ({
	itemId,
	kind: "armor",
	equipped: overrides.equipped ?? false,
	cursed: false,
	defenseBonus: 1,
	rustProtected: overrides.rustProtected ?? false,
});

const sword = (itemId: number, equipped = false): HeldItem => ({
	itemId,
	kind: "sword",
	equipped,
	cursed: false,
	attackBonus: 1,
});

describe("decideItemToUse", () => {
	it("is undefined with nothing beneficial held", () => {
		expect(decideItemToUse(baseState())).toBeUndefined();
	});

	it("uses a mapping scroll before anything else", () => {
		const state = {
			...baseState(),
			playerHp: 1,
			inventory: [
				consumable(1, "heal-potion"),
				consumable(2, "mapping-scroll"),
			],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 2 });
	});

	it("drinks a heal potion once at half HP or lower", () => {
		const state = {
			...baseState(),
			playerHp: 5,
			playerMaxHp: 10,
			inventory: [consumable(1, "heal-potion")],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 1 });
	});

	it("does not waste a heal potion above half HP", () => {
		const state = {
			...baseState(),
			playerHp: 6,
			playerMaxHp: 10,
			inventory: [consumable(1, "heal-potion")],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("eats food once satiety crosses the warning threshold", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD,
			inventory: [consumable(1, "food")],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 1 });
	});

	it("does not eat while satiety is still comfortably above the threshold", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD + 1,
			inventory: [consumable(1, "food")],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("equips a permanent-upside potion just sitting in inventory", () => {
		const state = {
			...baseState(),
			inventory: [consumable(1, "strength")],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 1 });
	});

	it("never proactively drinks a harmful potion", () => {
		const state = {
			...baseState(),
			inventory: [
				consumable(1, "poison"),
				consumable(2, "confusion"),
				consumable(3, "blindness"),
				consumable(4, "paralysis"),
				consumable(5, "hallucination"),
			],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("skips a disabled kind and falls through to the next priority item", () => {
		const state = {
			...baseState(),
			inventory: [sword(1), consumable(2, "strength")],
		};
		expect(decideItemToUse(state, new Set(["sword"]))).toEqual({ itemId: 2 });
	});

	it("skips a disabled kind even when it is the only priority-eligible item held", () => {
		const state = {
			...baseState(),
			playerFood: PLAYER_HUNGER_WARNING_THRESHOLD,
			inventory: [consumable(1, "food")],
		};
		expect(decideItemToUse(state, new Set(["food"]))).toBeUndefined();
	});

	it("frees a cursed equipped item with a held remove-curse scroll", () => {
		const state = {
			...baseState(),
			inventory: [
				{ ...armor(1, { equipped: true }), cursed: true },
				consumable(2, "remove-curse-scroll"),
			],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 2 });
	});

	it("does not waste a remove-curse scroll with nothing cursed equipped", () => {
		const state = {
			...baseState(),
			inventory: [
				armor(1, { equipped: true }),
				consumable(2, "remove-curse-scroll"),
			],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("targets the equipped armor with an enchant-armor scroll", () => {
		const state = {
			...baseState(),
			inventory: [
				armor(1, { equipped: false }),
				armor(2, { equipped: true }),
				consumable(3, "enchant-armor"),
			],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 3, targetItemId: 2 });
	});

	it("holds onto an enchant-weapon scroll with no sword to target", () => {
		const state = {
			...baseState(),
			inventory: [consumable(1, "enchant-weapon")],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("does not re-target already rust-protected armor with a protect-armor scroll", () => {
		const state = {
			...baseState(),
			inventory: [
				armor(1, { equipped: true, rustProtected: true }),
				consumable(2, "protect-armor"),
			],
		};
		expect(decideItemToUse(state)).toBeUndefined();
	});

	it("equips a newly found, strictly better sword", () => {
		const state = {
			...baseState(),
			inventory: [sword(1)],
		};
		expect(decideItemToUse(state)).toEqual({ itemId: 1 });
	});
});
