import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { PLAYER_MAX_HP } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";

describe("items/rings", () => {
	it("using a held ring sets hasRingOfRegeneration and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "regeneration-ring" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "regeneration-ring" },
		});
		expect(next.hasRingOfRegeneration).toBe(true);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "regeneration-ring" } },
		]);
	});

	it("using a second ring is consumed but changes nothing (already equipped)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			hasRingOfRegeneration: true,
			inventory: [{ kind: "regeneration-ring" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "regeneration-ring" },
		});
		expect(next.hasRingOfRegeneration).toBe(true);
		expect(next.inventory).toEqual([]);
	});

	it("using a held sustenance ring sets hasRingOfSustenance and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ kind: "sustenance-ring" as const, quantity: 1 }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { kind: "sustenance-ring" },
		});
		expect(next.hasRingOfSustenance).toBe(true);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "sustenance-ring" } },
		]);
	});

	it("a ring of regeneration heals HP over time via waiting turns (wired into every turn-consuming action)", () => {
		const state = {
			...buildArenaGameState(
				9,
				3,
				1,
			) /* this seed's first regen roll succeeds */,
			hasRingOfRegeneration: true,
			playerHp: PLAYER_MAX_HP - 3,
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.playerHp).toBe(state.playerHp + 1);
		expect(
			next.events.some((event) => event.type === "player-regenerated"),
		).toBe(true);
	});
});
