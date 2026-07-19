import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";

describe("items/scrolls", () => {
	it("using a held enchant weapon scroll always raises playerAttackDamage, never cursed", () => {
		/* seed 1 is the one that curses a sword (see equipment.test.ts) — an
		 * enchant scroll must still succeed unconditionally from the same rng state */
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["enchant-weapon" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "enchant-weapon" },
		});
		expect(next.playerAttackDamage).toBe(state.playerAttackDamage + 1);
		expect(next.inventory).toEqual([]);
		expect(next.rng).toEqual(state.rng); /* deterministic, no curse roll */
		expect(next.events).toEqual([
			{ type: "weapon-enchanted", payload: { bonus: 1 } },
		]);
	});

	it("using a held enchant armor scroll always raises playerDefense, never cursed", () => {
		/* seed 1 is the one that curses armor (see equipment.test.ts) — an
		 * enchant scroll must still succeed unconditionally from the same rng state */
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["enchant-armor" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "enchant-armor" },
		});
		expect(next.playerDefense).toBe(state.playerDefense + 1);
		expect(next.inventory).toEqual([]);
		expect(next.rng).toEqual(state.rng); /* deterministic, no curse roll */
		expect(next.events).toEqual([
			{ type: "armor-enchanted", payload: { bonus: 1 } },
		]);
	});

	it("using a held protect armor scroll sets armorProtected and logs armor-protected", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["protect-armor" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "protect-armor" },
		});
		expect(next.armorProtected).toBe(true);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([{ type: "armor-protected", payload: {} }]);
	});

	it("using a second protect armor scroll is consumed but changes nothing (already protected)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			armorProtected: true,
			inventory: ["protect-armor" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "protect-armor" },
		});
		expect(next.armorProtected).toBe(true);
		expect(next.inventory).toEqual([]);
	});

	it("using a held scroll teleports the player, consumes the scroll, and consumes rng", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: ["teleport-scroll" as const, "teleport-scroll" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "teleport-scroll" },
		});
		expect(next.inventory).toEqual(["teleport-scroll"]);
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
			inventory: ["mapping-scroll" as const],
		};
		const next = advanceTurn(withScroll, {
			type: "use-item",
			payload: { kind: "mapping-scroll" },
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
			inventory: ["identify-scroll" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify-scroll" },
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
				"identify-scroll" as const,
				"identify-scroll" as const,
				"identify-scroll" as const,
			],
		};
		const afterFirst = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify-scroll" },
		});
		expect(afterFirst.identifiedPotionKinds).toEqual(["heal-potion"]);

		const afterSecond = advanceTurn(afterFirst, {
			type: "use-item",
			payload: { kind: "identify-scroll" },
		});
		expect(afterSecond.identifiedPotionKinds).toEqual([
			"heal-potion",
			"poison",
		]);

		const afterThird = advanceTurn(afterSecond, {
			type: "use-item",
			payload: { kind: "identify-scroll" },
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
			inventory: ["identify-scroll" as const],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "identify-scroll" },
		});
		expect(next).toBe(state);
	});
});
