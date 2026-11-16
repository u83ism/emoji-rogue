import { describe, expect, it } from "vitest";
import { canFlyAgain, ERRATIC_MOVE_CHANCE_PERCENT } from "./enemyFlight.js";

const player = { x: 5, y: 5 };

describe("canFlyAgain", () => {
	it("lets a flying kind act again while it is two or more steps from the player", () => {
		for (const kind of ["bat", "kestrel", "griffin"] as const) {
			expect(canFlyAgain(kind, { x: 7, y: 5 }, player)).toBe(true);
			expect(canFlyAgain(kind, { x: 5, y: 3 }, player)).toBe(true);
			expect(canFlyAgain(kind, { x: 6, y: 7 }, player)).toBe(true);
		}
	});

	it("stops a flier that is next to the player, diagonally included", () => {
		expect(canFlyAgain("kestrel", { x: 6, y: 5 }, player)).toBe(false);
		expect(canFlyAgain("kestrel", { x: 5, y: 4 }, player)).toBe(false);
		expect(canFlyAgain("kestrel", { x: 6, y: 6 }, player)).toBe(false);
	});

	it("never applies to a kind that does not fly", () => {
		expect(canFlyAgain("zombie", { x: 9, y: 9 }, player)).toBe(false);
		expect(canFlyAgain("phantom", { x: 9, y: 9 }, player)).toBe(false);
	});
});

describe("ERRATIC_MOVE_CHANCE_PERCENT", () => {
	it("is original Rogue's: half of a bat's actions, a fifth of a phantom's, nobody else's", () => {
		expect(ERRATIC_MOVE_CHANCE_PERCENT).toEqual({ bat: 50, phantom: 20 });
	});
});
