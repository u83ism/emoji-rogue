import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../../initialState.js";
import { applyHealingPotion } from "./healing.js";

describe("applyHealingPotion", () => {
	it("heals level × dice, and past the maximum raises it by one and fills it", () => {
		const hurt = { ...buildArenaGameState(9, 3, 1), playerHp: 1 };
		const healed = applyHealingPotion(hurt, "heal-potion");
		expect(healed.playerHp).toBeGreaterThan(1);
		const full = buildArenaGameState(9, 3, 1);
		const over = applyHealingPotion(full, "heal-potion");
		expect(over.playerMaxHp).toBe(full.playerMaxHp + 1);
		expect(over.playerHp).toBe(over.playerMaxHp);
	});

	it("cures blindness, and extra healing ends a hallucination too", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			blindTurnsRemaining: 5,
			hallucinatingTurnsRemaining: 5,
		};
		const healed = applyHealingPotion(state, "heal-potion");
		expect(healed.blindTurnsRemaining).toBe(0);
		expect(healed.hallucinatingTurnsRemaining).toBe(5);
		expect(
			applyHealingPotion(state, "extra-healing-potion")
				.hallucinatingTurnsRemaining,
		).toBe(0);
	});
});
