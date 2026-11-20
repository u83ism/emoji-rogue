import { describe, expect, it } from "vitest";
import { ENEMY_KIND_VALUES } from "../events.js";
import {
	calculateEnemyExperienceReward,
	ENEMY_DEPTH_ORDER,
	ENEMY_STATS,
} from "./enemyStats.js";

describe("ENEMY_STATS", () => {
	it("gives every kind a positive level and at least one attack", () => {
		for (const kind of ENEMY_KIND_VALUES) {
			expect(ENEMY_STATS[kind].level).toBeGreaterThan(0);
			expect(ENEMY_STATS[kind].attacks.length).toBeGreaterThan(0);
		}
	});

	it("carries original Rogue's rows (spot checks against extern.c's monsters[])", () => {
		expect(ENEMY_STATS.dragon).toEqual({
			level: 10,
			armorClass: -1,
			attacks: [
				{ count: 1, sides: 8 },
				{ count: 1, sides: 8 },
				{ count: 3, sides: 10 },
			],
			experience: 5000,
		});
		expect(ENEMY_STATS.hobgoblin).toEqual({
			level: 1,
			armorClass: 5,
			attacks: [{ count: 1, sides: 8 }],
			experience: 3,
		});
		/* the leprechaun's row, under this game's name for it */
		expect(ENEMY_STATS.thief.level).toBe(3);
		expect(ENEMY_STATS.thief.armorClass).toBe(8);
	});
});

describe("ENEMY_DEPTH_ORDER", () => {
	it("lists every kind exactly once", () => {
		expect([...ENEMY_DEPTH_ORDER].sort()).toEqual(
			[...ENEMY_KIND_VALUES].sort(),
		);
	});

	it("runs from the kestrel to the dragon, as original Rogue's lvl_mons does", () => {
		expect(ENEMY_DEPTH_ORDER[0]).toBe("kestrel");
		expect(ENEMY_DEPTH_ORDER.at(-1)).toBe("dragon");
	});
});

describe("calculateEnemyExperienceReward", () => {
	it("adds an eighth of the individual's max HP at level 1", () => {
		/* hobgoblin: base 3 */
		expect(calculateEnemyExperienceReward("hobgoblin", 8)).toBe(4);
		expect(calculateEnemyExperienceReward("hobgoblin", 7)).toBe(3);
	});

	it("adds a sixth above level 1", () => {
		/* zombie: level 2, base 6 */
		expect(calculateEnemyExperienceReward("zombie", 12)).toBe(8);
	});

	it("multiplies the share x4 above level 6 and x20 above level 9", () => {
		/* vampire: level 8, base 350 */
		expect(calculateEnemyExperienceReward("vampire", 36)).toBe(350 + 6 * 4);
		/* dragon: level 10, base 5000 */
		expect(calculateEnemyExperienceReward("dragon", 48)).toBe(5000 + 8 * 20);
	});

	it("a deep-floor level bonus adds 10 a level and raises the level the share is taken at", () => {
		/* hobgoblin boosted to level 2: base 3 + 10, a sixth of 8 */
		expect(calculateEnemyExperienceReward("hobgoblin", 8, 1)).toBe(3 + 10 + 1);
		/* zombie boosted from 2 to 7: x4 multiplier, 40 for the bonus */
		expect(calculateEnemyExperienceReward("zombie", 12, 5)).toBe(
			6 + 50 + 2 * 4,
		);
	});
});
