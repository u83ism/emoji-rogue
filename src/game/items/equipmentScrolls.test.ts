import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";

describe("items/equipmentScrolls", () => {
	it("using a held enchant weapon scroll raises one of the targeted weapon's two bonuses and lifts its curse", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "weapon" as const,
					equipped: false,
					cursed: true /* enchanting also lifts the curse */,
					weaponKind: "long-sword" as const,
					hitBonus: 1,
					damageBonus: 1,
				},
				{ itemId: 2, kind: "enchant-weapon" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2, targetItemId: 1 },
		});
		const [enchantedEvent] = next.events;
		if (enchantedEvent?.type !== "weapon-enchanted") {
			throw new Error("unreachable: the scroll logs weapon-enchanted");
		}
		const { stat } = enchantedEvent.payload;
		/* a coin flip raises exactly one of the two bonuses, and the curse is lifted */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "weapon",
				equipped: false,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 1 + (stat === "hit" ? ENCHANT_WEAPON_BONUS : 0),
				damageBonus: 1 + (stat === "damage" ? ENCHANT_WEAPON_BONUS : 0),
			},
		]);
		expect(next.rng).not.toEqual(state.rng); /* the coin flip */
		expect(next.events).toEqual([
			{
				type: "weapon-enchanted",
				payload: { stat, bonus: ENCHANT_WEAPON_BONUS },
			},
		]);
	});

	it("an enchant weapon scroll's coin flip lands on either bonus", () => {
		const weapon = {
			itemId: 1,
			kind: "weapon" as const,
			weaponKind: "mace" as const,
			equipped: true,
			cursed: false,
			hitBonus: 0,
			damageBonus: 0,
		};
		const stats = new Set<string>();
		let rng = buildArenaGameState(9, 3, 1).rng;
		for (let attempt = 0; attempt < 40; attempt++) {
			const next = advanceTurn(
				{
					...buildArenaGameState(9, 3, 1),
					rng,
					inventory: [weapon, { itemId: 2, kind: "enchant-weapon" as const }],
				},
				{ type: "use-item", payload: { itemId: 2, targetItemId: 1 } },
			);
			rng = next.rng;
			const [event] = next.events;
			if (event?.type === "weapon-enchanted") {
				stats.add(event.payload.stat);
			}
		}
		expect([...stats].sort()).toEqual(["damage", "hit"]);
	});

	it("using a held enchant weapon scroll with no matching weapon held is a no-op (not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "enchant-weapon" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, targetItemId: 999 },
		});
		expect(next).toBe(state);
	});

	it("using a held enchant armor scroll raises the targeted armor's own defenseBonus and lifts its curse", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: true,
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
				{ itemId: 2, kind: "enchant-armor" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2, targetItemId: 1 },
		});
		/* the bonus goes up and the curse is lifted */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: false,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1 + ENCHANT_ARMOR_BONUS,
				rustProtected: false,
			},
		]);
		expect(next.rng).toEqual(state.rng); /* deterministic, no curse roll */
		expect(next.events).toEqual([
			{ type: "armor-enchanted", payload: { bonus: ENCHANT_ARMOR_BONUS } },
		]);
	});

	it("using a held protect armor scroll sets the targeted armor's rustProtected and logs armor-protected", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
				{ itemId: 2, kind: "protect-armor" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2, targetItemId: 1 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: false,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: true,
			},
		]);
		expect(next.events).toEqual([{ type: "armor-protected", payload: {} }]);
	});

	it("using a protect armor scroll on already-protected armor is a no-op (not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: true,
				},
				{ itemId: 2, kind: "protect-armor" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2, targetItemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("using a held remove-curse scroll frees every currently-equipped cursed item at once", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "weapon" as const,
					equipped: true,
					cursed: true,
					weaponKind: "long-sword" as const,
					hitBonus: 1,
					damageBonus: 1,
				},
				{
					itemId: 2,
					kind: "armor" as const,
					equipped: true,
					cursed: true,
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
				{
					itemId: 3,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: true,
				},
				/* held but not equipped — its curse must survive untouched */
				{
					itemId: 4,
					kind: "armor" as const,
					equipped: false,
					cursed: true,
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
				{ itemId: 5, kind: "remove-curse-scroll" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 5 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "weapon",
				equipped: true,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 1,
				damageBonus: 1,
			},
			{
				itemId: 2,
				kind: "armor",
				equipped: true,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
			{
				itemId: 3,
				kind: "regeneration-ring",
				equipped: true,
				cursed: false,
			},
			{
				itemId: 4,
				kind: "armor",
				equipped: false,
				cursed: true,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "items-decursed", payload: { count: 3 } },
		]);
	});

	it("using a held remove-curse scroll with nothing equipped and cursed is a no-op (not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "remove-curse-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
