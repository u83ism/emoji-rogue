import { describe, expect, it } from "vitest";
import { calculateEnemyCountForFloor } from "./balance.js";

describe("calculateEnemyCountForFloor", () => {
	it("returns the base count on floor 1", () => {
		expect(calculateEnemyCountForFloor("zombie", 1)).toBe(3);
		expect(calculateEnemyCountForFloor("bat", 1)).toBe(2);
	});

	it("grows one at a time at each kind's own interval", () => {
		/* zombies: +1 every 3 floors */
		expect(calculateEnemyCountForFloor("zombie", 3)).toBe(3);
		expect(calculateEnemyCountForFloor("zombie", 4)).toBe(4);
		expect(calculateEnemyCountForFloor("zombie", 6)).toBe(4);
		expect(calculateEnemyCountForFloor("zombie", 7)).toBe(5);

		/* bats: +1 every 2 floors — grow faster than zombies */
		expect(calculateEnemyCountForFloor("bat", 2)).toBe(2);
		expect(calculateEnemyCountForFloor("bat", 3)).toBe(3);
		expect(calculateEnemyCountForFloor("bat", 4)).toBe(3);
		expect(calculateEnemyCountForFloor("bat", 5)).toBe(4);
	});

	it("caps out at deep floors instead of growing forever", () => {
		expect(calculateEnemyCountForFloor("zombie", 1000)).toBe(8);
		expect(calculateEnemyCountForFloor("bat", 1000)).toBe(8);
	});
});
