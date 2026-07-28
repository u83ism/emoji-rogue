import { describe, expect, it } from "vitest";
import { resolveWraithDrain } from "./wraithDrain.js";

describe("resolveWraithDrain", () => {
	it("lowers playerMaxHp by amount and logs player-drained", () => {
		const result = resolveWraithDrain(10, 8, 1);
		expect(result.playerMaxHp).toBe(9);
		expect(result.playerHp).toBe(8); /* unaffected — still below the new max */
		expect(result.event).toEqual({
			type: "player-drained",
			payload: { amount: 1 },
		});
	});

	it("clamps playerHp down when it now exceeds the new max", () => {
		const result = resolveWraithDrain(5, 5, 1);
		expect(result.playerMaxHp).toBe(4);
		expect(result.playerHp).toBe(4);
	});

	it("never drains playerMaxHp below 1, and logs no event once already there", () => {
		const result = resolveWraithDrain(1, 1, 1);
		expect(result.playerMaxHp).toBe(1);
		expect(result.playerHp).toBe(1);
		expect(result.event).toBeUndefined();
	});

	it("partially drains when only one point of headroom remains above the floor", () => {
		const result = resolveWraithDrain(2, 2, 5);
		expect(result.playerMaxHp).toBe(1);
		expect(result.playerHp).toBe(1);
		expect(result.event).toEqual({
			type: "player-drained",
			payload: { amount: 1 },
		});
	});
});
