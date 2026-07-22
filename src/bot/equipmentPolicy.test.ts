import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import type { GameState, HeldItem } from "../game/state.js";
import {
	decideArmorToEquip,
	decideRingToEquip,
	decideSwordToEquip,
} from "./equipmentPolicy.js";

const baseState = (): GameState => buildArenaGameState(5, 5, 1);

const sword = (
	itemId: number,
	attackBonus: number,
	equipped = false,
): HeldItem => ({
	itemId,
	kind: "sword",
	equipped,
	cursed: false,
	attackBonus,
});

const armor = (
	itemId: number,
	defenseBonus: number,
	equipped = false,
): HeldItem => ({
	itemId,
	kind: "armor",
	equipped,
	cursed: false,
	defenseBonus,
	rustProtected: false,
});

const ring = (
	itemId: number,
	kind:
		| "regeneration-ring"
		| "sustenance-ring"
		| "stealth-ring"
		| "awareness-ring"
		| "aggravate-monster-ring",
	equipped = false,
): HeldItem => ({ itemId, kind, equipped, cursed: false });

const noDisabled = new Set<never>();

describe("decideSwordToEquip", () => {
	it("equips the only held sword when none is equipped", () => {
		const state = { ...baseState(), inventory: [sword(1, 1)] };
		expect(decideSwordToEquip(state, noDisabled)).toBe(1);
	});

	it("does not re-equip the sword already worn", () => {
		const state = { ...baseState(), inventory: [sword(1, 1, true)] };
		expect(decideSwordToEquip(state, noDisabled)).toBeUndefined();
	});

	it("swaps to a strictly better held sword", () => {
		const state = {
			...baseState(),
			inventory: [sword(1, 1, true), sword(2, 3)],
		};
		expect(decideSwordToEquip(state, noDisabled)).toBe(2);
	});

	it("does not swap to a worse or equal sword", () => {
		const state = {
			...baseState(),
			inventory: [sword(1, 3, true), sword(2, 1)],
		};
		expect(decideSwordToEquip(state, noDisabled)).toBeUndefined();
	});

	it("is disabled by the balance-experiment knob", () => {
		const state = { ...baseState(), inventory: [sword(1, 1)] };
		expect(decideSwordToEquip(state, new Set(["sword"]))).toBeUndefined();
	});
});

describe("decideArmorToEquip", () => {
	it("equips the only held armor when none is equipped", () => {
		const state = { ...baseState(), inventory: [armor(1, 1)] };
		expect(decideArmorToEquip(state, noDisabled)).toBe(1);
	});

	it("swaps to strictly better held armor", () => {
		const state = {
			...baseState(),
			inventory: [armor(1, 1, true), armor(2, 2)],
		};
		expect(decideArmorToEquip(state, noDisabled)).toBe(2);
	});
});

describe("decideRingToEquip", () => {
	it("equips the only held ring when none is equipped", () => {
		const state = {
			...baseState(),
			inventory: [ring(1, "regeneration-ring")],
		};
		expect(decideRingToEquip(state, noDisabled)).toBe(1);
	});

	it("never equips a ring of aggravate monster", () => {
		const state = {
			...baseState(),
			inventory: [ring(1, "aggravate-monster-ring")],
		};
		expect(decideRingToEquip(state, noDisabled)).toBeUndefined();
	});

	it("prefers sustenance over regeneration", () => {
		const state = {
			...baseState(),
			inventory: [
				ring(1, "regeneration-ring", true),
				ring(2, "sustenance-ring"),
			],
		};
		expect(decideRingToEquip(state, noDisabled)).toBe(2);
	});

	it("does not downgrade from sustenance to regeneration", () => {
		const state = {
			...baseState(),
			inventory: [
				ring(1, "sustenance-ring", true),
				ring(2, "regeneration-ring"),
			],
		};
		expect(decideRingToEquip(state, noDisabled)).toBeUndefined();
	});

	it("only ever wears one ring at a time regardless of kind", () => {
		const state = {
			...baseState(),
			inventory: [ring(1, "awareness-ring", true), ring(2, "stealth-ring")],
		};
		/* awareness outranks stealth in RING_PREFERENCE_ORDER, so the already-worn one stays */
		expect(decideRingToEquip(state, noDisabled)).toBeUndefined();
	});
});
