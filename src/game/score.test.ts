import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "./initialState.js";
import { calculateItemWorth, calculateScore } from "./score.js";
import type { GameState, HeldItem } from "./state.js";

const buildState = (overrides: Partial<GameState>): GameState => ({
	...buildArenaGameState(5, 5, 1),
	goldCollected: 1234,
	inventory: [],
	...overrides,
});

describe("calculateScore", () => {
	it("is the gold collected alone while playing or after quitting — no depth or level bonus", () => {
		for (const status of ["playing", "exited", "suspended"] as const) {
			expect(
				calculateScore(
					buildState({
						status,
						floor: 20,
						playerLevel: 9,
					}),
				),
			).toBe(1234);
		}
	});

	it("takes original Rogue's 10% death tax (rounded down) off a dead run's gold", () => {
		expect(calculateScore(buildState({ status: "dead" }))).toBe(1234 - 123);
		expect(
			calculateScore(buildState({ status: "dead", goldCollected: 9 })),
		).toBe(9);
	});

	it("adds the whole pack's worth and the amulet's 1000 to a won run's gold", () => {
		const state = buildState({
			status: "won",
			hasAmulet: true,
			inventory: [
				{ itemId: 1, kind: "food" },
				{ itemId: 2, kind: "teleport-scroll" },
			],
		});
		expect(calculateScore(state)).toBe(1234 + 1000 + 2 + 165);
	});
});

describe("calculateItemWorth", () => {
	it("prices a weapon by 3 × its pluses plus its count, never below 0", () => {
		const mace = (hitBonus: number, damageBonus: number): HeldItem => ({
			itemId: 1,
			kind: "weapon",
			weaponKind: "mace",
			equipped: true,
			cursed: false,
			hitBonus,
			damageBonus,
			quantity: 1,
		});
		expect(calculateItemWorth(mace(1, 1), [])).toBe(8 * (3 * 2 + 1));
		expect(calculateItemWorth(mace(-3, 0), [])).toBe(0);
	});

	it("prices an armor by how far its armor class sits below 9 and below its kind's own", () => {
		const ringMail: HeldItem = {
			itemId: 1,
			kind: "armor",
			armorKind: "ring-mail",
			equipped: true,
			cursed: false,
			defenseBonus: 1,
			rustProtected: false,
		};
		/* armor class 7 - 1 = 6 */
		expect(calculateItemWorth(ringMail, [])).toBe(25 + 3 * 100 + 10);
	});

	it("halves an identifiable kind while it is still unidentified", () => {
		const ring: HeldItem = {
			itemId: 1,
			kind: "stealth-ring",
			equipped: false,
			cursed: false,
		};
		expect(calculateItemWorth(ring, [])).toBe(235);
		expect(calculateItemWorth(ring, ["stealth-ring"])).toBe(470);
		expect(calculateItemWorth({ itemId: 2, kind: "poison" }, [])).toBe(2);
	});
});
