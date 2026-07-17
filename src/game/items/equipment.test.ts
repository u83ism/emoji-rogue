import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { buildArenaGameState } from "../initialState.js";

/*
 * Whether a sword/shield use is blessed or cursed is rolled fresh from
 * state.rng each time (see SWORD_CURSE_CHANCE_PERCENT's comment in
 * balance.ts) — seed 1's very first roll happens to land cursed, seed 411's
 * happens to land blessed. Both are exercised explicitly below instead of
 * assuming either outcome.
 */
describe("items/equipment", () => {
	it("using a held sword permanently raises playerAttackDamage when blessed", () => {
		const state = {
			...buildArenaGameState(9, 3, 411),
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

	it("using a second blessed sword stacks the attack bonus", () => {
		const state = {
			...buildArenaGameState(9, 3, 411),
			playerAttackDamage: 2 /* as if a first sword was already used */,
			inventory: [{ kind: "sword" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "sword" },
		});
		expect(next.playerAttackDamage).toBe(3);
	});

	it("using a cursed sword lowers playerAttackDamage, clamped at MIN_PLAYER_ATTACK_DAMAGE", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "sword" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "sword" },
		});
		expect(next.playerAttackDamage).toBe(1); /* clamped: was already 1 */
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "weapon-equipped", payload: { kind: "sword", bonus: 0 } },
		]);
	});

	it("using a held shield permanently raises playerDefense when blessed", () => {
		const state = {
			...buildArenaGameState(9, 3, 411),
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

	it("using a second blessed shield stacks the defense bonus", () => {
		const state = {
			...buildArenaGameState(9, 3, 411),
			playerDefense: 1 /* as if a first shield was already used */,
			inventory: [{ kind: "shield" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "shield" },
		});
		expect(next.playerDefense).toBe(2);
	});

	it("using a cursed shield lowers playerDefense, which can go negative", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "shield" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "shield" },
		});
		expect(next.playerDefense).toBe(-1);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "armor-equipped", payload: { kind: "shield", bonus: -1 } },
		]);
	});
});
