import { describe, expect, it } from "vitest";
import {
	UNARMED_DAMAGE_DICE,
	UNARMORED_ARMOR_CLASS,
	WEAK_ATTACK_PENALTY,
} from "../balance.js";
import type { ArmorKind, WeaponKind } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import type { HeldItem } from "../state.js";
import {
	calculatePlayerArmorClass,
	calculatePlayerDamageBonus,
	calculatePlayerDamageDice,
	calculatePlayerDefense,
	calculatePlayerHitBonus,
} from "./equipmentStats.js";

const weaponOf = (
	weaponKind: WeaponKind,
	hitBonus: number,
	damageBonus: number,
	equipped = true,
): HeldItem => ({
	itemId: 1,
	kind: "weapon",
	weaponKind,
	equipped,
	cursed: false,
	hitBonus,
	damageBonus,
});

const armorOf = (
	armorKind: ArmorKind,
	defenseBonus: number,
	equipped = true,
): HeldItem => ({
	itemId: 2,
	kind: "armor",
	armorKind,
	equipped,
	cursed: false,
	defenseBonus,
	rustProtected: false,
});

describe("calculatePlayerDamageDice", () => {
	it("is the bare-handed die with no weapon equipped", () => {
		expect(calculatePlayerDamageDice([])).toEqual(UNARMED_DAMAGE_DICE);
		expect(
			calculatePlayerDamageDice([weaponOf("two-handed-sword", 0, 0, false)]),
		).toEqual(UNARMED_DAMAGE_DICE);
	});

	it("is the equipped weapon's own kind's dice, as in original Rogue", () => {
		expect(calculatePlayerDamageDice([weaponOf("mace", 0, 0)])).toEqual({
			count: 2,
			sides: 4,
		});
		expect(calculatePlayerDamageDice([weaponOf("long-sword", 0, 0)])).toEqual({
			count: 3,
			sides: 4,
		});
		expect(calculatePlayerDamageDice([weaponOf("dagger", 0, 0)])).toEqual({
			count: 1,
			sides: 6,
		});
		expect(
			calculatePlayerDamageDice([weaponOf("two-handed-sword", 0, 0)]),
		).toEqual({ count: 4, sides: 4 });
		expect(calculatePlayerDamageDice([weaponOf("spear", 0, 0)])).toEqual({
			count: 2,
			sides: 3,
		});
	});
});

describe("calculatePlayerDamageBonus / calculatePlayerHitBonus", () => {
	const state = buildArenaGameState(9, 3, 1);

	it("keeps the weapon's two bonuses apart: damage adds to playerPower, to-hit stands alone", () => {
		const inventory = [weaponOf("mace", 3, 1)];
		expect(calculatePlayerDamageBonus({ ...state, inventory })).toBe(
			state.playerPower + 1,
		);
		expect(calculatePlayerHitBonus(inventory)).toBe(3);
	});

	it("is just playerPower and 0 with nothing wielded", () => {
		expect(calculatePlayerDamageBonus(state)).toBe(state.playerPower);
		expect(calculatePlayerHitBonus([])).toBe(0);
		expect(calculatePlayerHitBonus([weaponOf("mace", 3, 1, false)])).toBe(0);
	});

	it("loses WEAK_ATTACK_PENALTY while starving, with no floor of its own", () => {
		expect(
			calculatePlayerDamageBonus({
				...state,
				playerFood: 0,
				inventory: [weaponOf("mace", 0, -3)],
			}),
		).toBe(state.playerPower - 3 - WEAK_ATTACK_PENALTY);
	});
});

describe("calculatePlayerArmorClass / calculatePlayerDefense", () => {
	it("is UNARMORED_ARMOR_CLASS and 0 defense with nothing worn", () => {
		expect(calculatePlayerArmorClass([])).toBe(UNARMORED_ARMOR_CLASS);
		expect(calculatePlayerDefense([])).toBe(0);
		expect(calculatePlayerArmorClass([armorOf("plate-mail", 0, false)])).toBe(
			UNARMORED_ARMOR_CLASS,
		);
	});

	it("is the armor kind's own class, as in original Rogue", () => {
		expect(calculatePlayerArmorClass([armorOf("leather-armor", 0)])).toBe(8);
		expect(calculatePlayerArmorClass([armorOf("ring-mail", 0)])).toBe(7);
		expect(calculatePlayerArmorClass([armorOf("chain-mail", 0)])).toBe(5);
		expect(calculatePlayerArmorClass([armorOf("plate-mail", 0)])).toBe(3);
	});

	it("is lowered by the armor's own defenseBonus and raised by a cursed negative one", () => {
		/* the starting kit: ring mail +1 */
		expect(calculatePlayerArmorClass([armorOf("ring-mail", 1)])).toBe(6);
		expect(calculatePlayerDefense([armorOf("ring-mail", 1)])).toBe(4);
		expect(calculatePlayerArmorClass([armorOf("ring-mail", -2)])).toBe(9);
	});
});
