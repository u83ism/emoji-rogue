import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import {
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
} from "../balance.js";
import { ARMOR_KIND_VALUES, WEAPON_KIND_VALUES } from "../events.js";
import { buildFloorItem, toHeldItem } from "./heldItemFactory.js";

const rollWeaponIdentities = (count: number) => {
	const rng = createRng(1);
	return Array.from({ length: count }, () => {
		const item = buildFloorItem("weapon", 1, { x: 0, y: 0 }, rng);
		if (item.kind !== "weapon") {
			throw new Error("unreachable: requested a weapon");
		}
		return item.identity;
	});
};

const rollArmorIdentities = (count: number) => {
	const rng = createRng(1);
	return Array.from({ length: count }, () => {
		const item = buildFloorItem("armor", 1, { x: 0, y: 0 }, rng);
		if (item.kind !== "armor") {
			throw new Error("unreachable: requested armor");
		}
		return item.identity;
	});
};

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

	it("draws every weapon kind, the heavier-weighted spear more often than the dagger", () => {
		const identities = rollWeaponIdentities(2000);
		const countOf = (weaponKind: string): number =>
			identities.filter((identity) => identity.weaponKind === weaponKind)
				.length;
		for (const weaponKind of WEAPON_KIND_VALUES) {
			expect(countOf(weaponKind)).toBeGreaterThan(0);
		}
		/* spawn weights 12 vs 8 */
		expect(countOf("spear")).toBeGreaterThan(countOf("dagger"));
	});

	it("rolls weapons like original Rogue: a curse lowers the to-hit bonus by 1-3, a found enchantment raises it by 1-3, and the damage bonus is never touched", () => {
		const identities = rollWeaponIdentities(2000);
		const cursed = identities.filter((identity) => identity.cursed);
		const enchanted = identities.filter((identity) => identity.hitBonus > 0);
		for (const identity of identities) {
			expect(identity.damageBonus).toBe(0);
		}
		for (const identity of cursed) {
			expect(identity.hitBonus).toBeGreaterThanOrEqual(
				-FOUND_BONUS_ADJUSTMENT_MAX,
			);
			expect(identity.hitBonus).toBeLessThanOrEqual(
				-FOUND_BONUS_ADJUSTMENT_MIN,
			);
		}
		for (const identity of enchanted) {
			expect(identity.cursed).toBe(false);
			expect(identity.hitBonus).toBeLessThanOrEqual(FOUND_BONUS_ADJUSTMENT_MAX);
		}
		/* 10% cursed / 5% found enchanted, with generous sampling slack */
		expect(cursed.length).toBeGreaterThan(140);
		expect(cursed.length).toBeLessThan(260);
		expect(enchanted.length).toBeGreaterThan(60);
		expect(enchanted.length).toBeLessThan(140);
		/* every step of the range actually occurs */
		expect(new Set(cursed.map((identity) => identity.hitBonus))).toEqual(
			new Set([-1, -2, -3]),
		);
	});

	it("draws every armor kind, leather the most often and plate mail the least", () => {
		const identities = rollArmorIdentities(2000);
		const countOf = (armorKind: string): number =>
			identities.filter((identity) => identity.armorKind === armorKind).length;
		for (const armorKind of ARMOR_KIND_VALUES) {
			expect(countOf(armorKind)).toBeGreaterThan(0);
		}
		/* spawn weights 20 vs 5 */
		expect(countOf("leather-armor")).toBeGreaterThan(countOf("plate-mail"));
	});

	it("rolls armor the same way at its own rates (20% cursed / 8% found enchanted), on its defenseBonus", () => {
		const identities = rollArmorIdentities(2000);
		const cursed = identities.filter((identity) => identity.cursed);
		const enchanted = identities.filter(
			(identity) => identity.defenseBonus > 0,
		);
		expect(cursed.length).toBeGreaterThan(320);
		expect(cursed.length).toBeLessThan(480);
		expect(enchanted.length).toBeGreaterThan(110);
		expect(enchanted.length).toBeLessThan(210);
		for (const identity of cursed) {
			expect(identity.defenseBonus).toBeLessThan(0);
		}
		for (const identity of enchanted) {
			expect(identity.cursed).toBe(false);
		}
		for (const identity of identities) {
			expect(identity.rustProtected).toBe(false);
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
			identity: {
				itemId: 7,
				cursed: true,
				weaponKind: "long-sword" as const,
				hitBonus: 3,
				damageBonus: 3,
				quantity: 1,
			},
		};
		expect(toHeldItem(item, 999)).toEqual({
			itemId: 7,
			kind: "weapon",
			equipped: false,
			cursed: true,
			weaponKind: "long-sword" as const,
			hitBonus: 3,
			damageBonus: 3,
			quantity: 1,
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

describe("bundled weapon kinds", () => {
	it("come several at a time — arrows, darts and shuriken 8-15, daggers 2-5 — and everything else singly", () => {
		const rng = createRng(3);
		const seen = new Map<string, Set<number>>();
		for (let draw = 0; draw < 3000; draw++) {
			const item = buildFloorItem("weapon", 1, { x: 0, y: 0 }, rng);
			if (item.kind !== "weapon") {
				throw new Error("unreachable: requested a weapon");
			}
			const { weaponKind, quantity } = item.identity;
			seen.set(weaponKind, (seen.get(weaponKind) ?? new Set()).add(quantity));
		}
		const rangeOf = (weaponKind: string): readonly [number, number] => {
			const quantities = [...(seen.get(weaponKind) ?? [])];
			return [Math.min(...quantities), Math.max(...quantities)];
		};
		expect(rangeOf("arrow")).toEqual([8, 15]);
		expect(rangeOf("dart")).toEqual([8, 15]);
		expect(rangeOf("shuriken")).toEqual([8, 15]);
		expect(rangeOf("dagger")).toEqual([2, 5]);
		for (const single of [
			"mace",
			"long-sword",
			"short-bow",
			"two-handed-sword",
			"spear",
		]) {
			expect(rangeOf(single)).toEqual([1, 1]);
		}
	});
});
