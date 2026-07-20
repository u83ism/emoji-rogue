import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../balance.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";

describe("items/scrolls", () => {
	it("using a held enchant weapon scroll raises the targeted sword's own attackBonus, regardless of that sword's curse", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: false,
					cursed: true /* enchanting works the same whether the target is cursed or not */,
					attackBonus: 1,
				},
				{ itemId: 2, kind: "enchant-weapon" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2, targetItemId: 1 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: false,
				cursed: true,
				attackBonus: 1 + ENCHANT_WEAPON_BONUS,
			},
		]);
		expect(next.rng).toEqual(state.rng); /* deterministic, no curse roll */
		expect(next.events).toEqual([
			{ type: "weapon-enchanted", payload: { bonus: ENCHANT_WEAPON_BONUS } },
		]);
	});

	it("using a held enchant weapon scroll with no matching sword held is a no-op (not consumed)", () => {
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

	it("using a held enchant armor scroll raises the targeted armor's own defenseBonus, regardless of that armor's curse", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: true,
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
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: false,
				cursed: true,
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
					kind: "sword" as const,
					equipped: true,
					cursed: true,
					attackBonus: 1,
				},
				{
					itemId: 2,
					kind: "armor" as const,
					equipped: true,
					cursed: true,
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
				kind: "sword",
				equipped: true,
				cursed: false,
				attackBonus: 1,
			},
			{
				itemId: 2,
				kind: "armor",
				equipped: true,
				cursed: false,
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

	it("using a held scroll teleports the player, consumes the scroll, and consumes rng", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "teleport-scroll" as const },
				{ itemId: 2, kind: "teleport-scroll" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "teleport-scroll" }]);
		expect(next.rng).not.toEqual(state.rng);
		expect(next.events).toEqual([
			{
				type: "player-teleported",
				payload: { x: next.player.x, y: next.player.y },
			},
		]);
	});

	it("using a held mapping scroll reveals the entire floor as explored", () => {
		const state = buildDungeonGameState(40, 20, 7);
		const withScroll = {
			...state,
			inventory: [{ itemId: 1, kind: "mapping-scroll" as const }],
		};
		const next = advanceTurn(withScroll, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.player).toEqual(
			state.player,
		); /* mapping does not move the player */
		expect(next.events).toEqual([{ type: "floor-mapped", payload: {} }]);
		for (let x = 0; x < next.width; x++) {
			for (let y = 0; y < next.height; y++) {
				expect(next.explored[x]?.[y]).toBe(true);
			}
		}
	});

	it("using a held identify scroll identifies the first unidentified potion kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "identify-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.identifiedPotionKinds).toEqual(["heal-potion"]);
		expect(next.events).toEqual([
			{ type: "potion-identified", payload: { kind: "heal-potion" } },
		]);
	});

	it("identifying repeatedly reveals one potion kind per scroll, in order", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "identify-scroll" as const },
				{ itemId: 2, kind: "identify-scroll" as const },
				{ itemId: 3, kind: "identify-scroll" as const },
			],
		};
		const afterFirst = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(afterFirst.identifiedPotionKinds).toEqual(["heal-potion"]);

		const afterSecond = advanceTurn(afterFirst, {
			type: "use-item",
			payload: { itemId: 2 },
		});
		expect(afterSecond.identifiedPotionKinds).toEqual([
			"heal-potion",
			"poison",
		]);

		const afterThird = advanceTurn(afterSecond, {
			type: "use-item",
			payload: { itemId: 3 },
		});
		expect(afterThird.identifiedPotionKinds).toEqual([
			"heal-potion",
			"poison",
			"strength",
		]);
	});

	it("is a no-op (same reference, no turn spent) once everything is already identified", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			identifiedPotionKinds: [
				"heal-potion",
				"poison",
				"strength",
				"confusion",
				"levitation",
				"blindness",
				"paralysis",
				"raise-level",
				"detect-monster",
				"life",
			] as const,
			inventory: [{ itemId: 1, kind: "identify-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("using a held confuse monster scroll sets the nearest visible (non-adjacent) enemy's confusedTurnsRemaining and logs enemy-confused", () => {
		const target = {
			x: 7,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "confuse-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "enemy-confused" && event.payload.target === "zombie",
			),
		).toBe(true);
		expect(next.enemies[0]?.confusedTurnsRemaining).toBeGreaterThan(0);
	});

	it("using a held confuse monster scroll with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "confuse-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
