import { describe, expect, it } from "vitest";
import { resolveEnemyRegen } from "./enemyRegen.js";

describe("resolveEnemyRegen", () => {
	it("heals a troll by TROLL_REGEN_AMOUNT and logs enemy-regenerated", () => {
		const result = resolveEnemyRegen("troll", 2, 6);
		expect(result.hp).toBe(4); /* 2 + TROLL_REGEN_AMOUNT (2) */
		expect(result.event).toEqual({
			type: "enemy-regenerated",
			payload: { target: "troll", amount: 2 },
		});
	});

	it("heals a griffin by GRIFFIN_REGEN_AMOUNT and logs enemy-regenerated", () => {
		const result = resolveEnemyRegen("griffin", 2, 6);
		expect(result.hp).toBe(3); /* 2 + GRIFFIN_REGEN_AMOUNT (1) */
		expect(result.event).toEqual({
			type: "enemy-regenerated",
			payload: { target: "griffin", amount: 1 },
		});
	});

	it("caps the heal at maxHp instead of overshooting, logging the floored amount", () => {
		const result = resolveEnemyRegen("troll", 5, 6);
		expect(result.hp).toBe(6);
		expect(result.event).toEqual({
			type: "enemy-regenerated",
			payload: { target: "troll", amount: 1 },
		});
	});

	it("does not heal, and logs no event, once already at maxHp", () => {
		const result = resolveEnemyRegen("troll", 6, 6);
		expect(result.hp).toBe(6);
		expect(result.event).toBeUndefined();
	});

	it("is a no-op for every kind other than griffin/troll", () => {
		const result = resolveEnemyRegen("zombie", 1, 2);
		expect(result.hp).toBe(1);
		expect(result.event).toBeUndefined();
	});
});
