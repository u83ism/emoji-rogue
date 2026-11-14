import { describe, expect, it } from "vitest";
import {
	SWORD_DAMAGE_DICE,
	UNARMED_DAMAGE_DICE,
	UNARMORED_ARMOR_CLASS,
	WEAK_ATTACK_PENALTY,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { HeldItem } from "../state.js";
import {
	calculatePlayerArmorClass,
	calculatePlayerAttackDamage,
	calculatePlayerDamageDice,
	calculatePlayerDefense,
} from "./equipmentStats.js";

const swordWith = (attackBonus: number, equipped = true): HeldItem => ({
	itemId: 1,
	kind: "sword",
	equipped,
	cursed: false,
	attackBonus,
});

const armorWith = (defenseBonus: number, equipped = true): HeldItem => ({
	itemId: 2,
	kind: "armor",
	equipped,
	cursed: false,
	defenseBonus,
	rustProtected: false,
});

describe("calculatePlayerDamageDice", () => {
	it("is the bare-handed die with no sword equipped", () => {
		expect(calculatePlayerDamageDice([])).toEqual(UNARMED_DAMAGE_DICE);
		expect(calculatePlayerDamageDice([swordWith(1, false)])).toEqual(
			UNARMED_DAMAGE_DICE,
		);
	});

	it("is the sword's dice once one is equipped", () => {
		expect(calculatePlayerDamageDice([swordWith(1)])).toEqual(
			SWORD_DAMAGE_DICE,
		);
	});
});

describe("calculatePlayerAttackDamage", () => {
	const state = buildArenaGameState(9, 3, 1);

	it("is playerPower plus the equipped sword's attackBonus", () => {
		expect(calculatePlayerAttackDamage(state)).toBe(state.playerPower);
		expect(
			calculatePlayerAttackDamage({ ...state, inventory: [swordWith(2)] }),
		).toBe(state.playerPower + 2);
	});

	it("loses WEAK_ATTACK_PENALTY while starving, with no floor of its own", () => {
		expect(
			calculatePlayerAttackDamage({
				...state,
				playerFood: 0,
				inventory: [swordWith(-3)],
			}),
		).toBe(state.playerPower - 3 - WEAK_ATTACK_PENALTY);
	});
});

describe("calculatePlayerDefense / calculatePlayerArmorClass", () => {
	it("is 0 defense and UNARMORED_ARMOR_CLASS with nothing worn", () => {
		expect(calculatePlayerDefense([])).toBe(0);
		expect(calculatePlayerArmorClass([])).toBe(UNARMORED_ARMOR_CLASS);
		expect(calculatePlayerArmorClass([armorWith(3, false)])).toBe(
			UNARMORED_ARMOR_CLASS,
		);
	});

	it("lowers the armor class by the equipped armor's defenseBonus, and raises it for a cursed negative one", () => {
		expect(calculatePlayerArmorClass([armorWith(3)])).toBe(
			UNARMORED_ARMOR_CLASS - 3,
		);
		expect(calculatePlayerArmorClass([armorWith(-2)])).toBe(
			UNARMORED_ARMOR_CLASS + 2,
		);
	});
});
