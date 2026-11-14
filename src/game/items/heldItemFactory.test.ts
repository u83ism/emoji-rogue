import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import {
	ARMOR_DEFENSE_BONUS,
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
	WEAPON_ATTACK_BONUS,
} from "../balance.js";
import { buildFloorItem, toHeldItem } from "./heldItemFactory.js";

describe("buildFloorItem", () => {
	it("gives a consumable just its position and kind, no identity, never touching rng", () => {
		const item = buildFloorItem("heal-potion", 3, { x: 0, y: 0 }, createRng(1));
		expect(item).toEqual({ x: 0, y: 0, kind: "heal-potion" });
	});

	it("gives a weapon an identity with the requested itemId", () => {
		const item = buildFloorItem("weapon", 5, { x: 1, y: 2 }, createRng(1));
		if (item.kind !== "weapon") {
			throw new Error("unreachable: requested a weapon");
		}
		expect(item.identity.itemId).toBe(5);
	});

	it("rolls weapons like original Rogue: cursed ones are 1-3 points worse, found-enchanted ones 1-3 better, the rest ordinary", () => {
		const rng = createRng(1);
		const identities = Array.from({ length: 2000 }, () => {
			const item = buildFloorItem("weapon", 1, { x: 0, y: 0 }, rng);
			if (item.kind !== "weapon") {
				throw new Error("unreachable: requested a weapon");
			}
			return item.identity;
		});
		const cursed = identities.filter((identity) => identity.cursed);
		const uncursed = identities.filter((identity) => !identity.cursed);
		const enchanted = uncursed.filter(
			(identity) => identity.attackBonus > WEAPON_ATTACK_BONUS,
		);
		for (const identity of cursed) {
			expect(identity.attackBonus).toBeGreaterThanOrEqual(
				WEAPON_ATTACK_BONUS - FOUND_BONUS_ADJUSTMENT_MAX,
			);
			expect(identity.attackBonus).toBeLessThanOrEqual(
				WEAPON_ATTACK_BONUS - FOUND_BONUS_ADJUSTMENT_MIN,
			);
		}
		for (const identity of uncursed) {
			expect(identity.attackBonus).toBeGreaterThanOrEqual(WEAPON_ATTACK_BONUS);
			expect(identity.attackBonus).toBeLessThanOrEqual(
				WEAPON_ATTACK_BONUS + FOUND_BONUS_ADJUSTMENT_MAX,
			);
		}
		/* 10% cursed / 5% found enchanted, with generous sampling slack */
		expect(cursed.length).toBeGreaterThan(140);
		expect(cursed.length).toBeLessThan(260);
		expect(enchanted.length).toBeGreaterThan(60);
		expect(enchanted.length).toBeLessThan(140);
		/* every step of the range actually occurs — the bonus can go negative */
		expect(new Set(cursed.map((identity) => identity.attackBonus))).toEqual(
			new Set([0, -1, -2]),
		);
	});

	it("rolls armor the same way at its own rates (20% cursed / 8% found enchanted)", () => {
		const rng = createRng(1);
		const identities = Array.from({ length: 2000 }, () => {
			const item = buildFloorItem("armor", 1, { x: 0, y: 0 }, rng);
			if (item.kind !== "armor") {
				throw new Error("unreachable: requested armor");
			}
			return item.identity;
		});
		const cursed = identities.filter((identity) => identity.cursed);
		const enchanted = identities.filter(
			(identity) => identity.defenseBonus > ARMOR_DEFENSE_BONUS,
		);
		expect(cursed.length).toBeGreaterThan(320);
		expect(cursed.length).toBeLessThan(480);
		expect(enchanted.length).toBeGreaterThan(110);
		expect(enchanted.length).toBeLessThan(210);
		for (const identity of cursed) {
			expect(identity.defenseBonus).toBeLessThan(ARMOR_DEFENSE_BONUS);
		}
		for (const identity of enchanted) {
			expect(identity.cursed).toBe(false);
		}
	});

	it("always curses the aggravate-monster ring and never any other ring, consuming no rng", () => {
		const rng = createRng(1);
		const before = rng.getState();
		const aggravate = buildFloorItem(
			"aggravate-monster-ring",
			1,
			{ x: 0, y: 0 },
			rng,
		);
		expect(aggravate).toEqual({
			x: 0,
			y: 0,
			kind: "aggravate-monster-ring",
			identity: { itemId: 1, cursed: true },
		});
		for (const kind of [
			"regeneration-ring",
			"sustenance-ring",
			"stealth-ring",
			"awareness-ring",
		] as const) {
			expect(buildFloorItem(kind, 2, { x: 0, y: 0 }, rng)).toEqual({
				x: 0,
				y: 0,
				kind,
				identity: { itemId: 2, cursed: false },
			});
		}
		expect(rng.getState()).toEqual(before);
	});

	it("is deterministic: the same seed and itemId always produce the same identity", () => {
		const first = buildFloorItem("armor", 1, { x: 0, y: 0 }, createRng(42));
		const second = buildFloorItem("armor", 1, { x: 0, y: 0 }, createRng(42));
		expect(first).toEqual(second);
	});
});

describe("toHeldItem", () => {
	it("restores a floor weapon's exact identity, adding equipped: false", () => {
		const item = {
			x: 0,
			y: 0,
			kind: "weapon" as const,
			identity: { itemId: 7, cursed: true, attackBonus: 3 },
		};
		expect(toHeldItem(item, 999)).toEqual({
			itemId: 7,
			kind: "weapon",
			equipped: false,
			cursed: true,
			attackBonus: 3,
		});
	});

	it("restores a floor ring's exact identity", () => {
		const item = {
			x: 0,
			y: 0,
			kind: "regeneration-ring" as const,
			identity: { itemId: 4, cursed: false },
		};
		expect(toHeldItem(item, 999)).toEqual({
			itemId: 4,
			kind: "regeneration-ring",
			equipped: false,
			cursed: false,
		});
	});

	it("gives a consumable the freshItemId — it has no identity to restore", () => {
		const item = { x: 0, y: 0, kind: "heal-potion" as const };
		expect(toHeldItem(item, 42)).toEqual({ itemId: 42, kind: "heal-potion" });
	});
});
