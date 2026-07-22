import { describe, expect, it } from "vitest";
import { resolveVampireLifesteal } from "./vampireLifesteal.js";

describe("resolveVampireLifesteal", () => {
	it("heals VAMPIRE_LIFESTEAL_PERCENT (floored) of the damage dealt and logs vampire-healed", () => {
		const result = resolveVampireLifesteal(2, 4, 3);
		expect(result.hp).toBe(3); /* 2 + floor(3 * 0.5) = 2 + 1 */
		expect(result.event).toEqual({
			type: "vampire-healed",
			payload: { amount: 1 },
		});
	});

	it("does not heal, and logs no event, once already at maxHp", () => {
		const result = resolveVampireLifesteal(4, 4, 10);
		expect(result.hp).toBe(4);
		expect(result.event).toBeUndefined();
	});

	it("caps the heal at maxHp instead of overshooting", () => {
		const result = resolveVampireLifesteal(3, 4, 10);
		expect(result.hp).toBe(4);
		expect(result.event).toEqual({
			type: "vampire-healed",
			payload: { amount: 1 },
		});
	});

	it("logs no event when the floored amount is zero", () => {
		const result = resolveVampireLifesteal(0, 4, 1);
		expect(result.hp).toBe(0); /* floor(1 * 0.5) = 0 */
		expect(result.event).toBeUndefined();
	});
});
