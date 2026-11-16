import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../../rng.js";
import { FOOD_DROUGHT_FLOOR_LIMIT, FOOD_ROLLS_PER_FLOOR } from "../balance.js";
import { drawFloorFood } from "./food.js";

/** Every roll returns its lower bound: every food roll lands. */
const createAlwaysHitRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (lowerBound, _upperBound) => lowerBound,
});

/** Every roll returns its upper bound: every food roll misses. */
const createAlwaysMissRng = (): Rng => ({
	...createRng(1),
	getUniformInt: (_lowerBound, upperBound) => upperBound,
});

describe("drawFloorFood", () => {
	it("gives one ration per landed roll and clears the drought counter", () => {
		expect(drawFloorFood(createAlwaysHitRng(), 2)).toEqual({
			foodCount: FOOD_ROLLS_PER_FLOOR,
			floorsWithoutFood: 0,
		});
	});

	it("with every roll missing, gives nothing and counts the floor toward a drought", () => {
		expect(drawFloorFood(createAlwaysMissRng(), 0)).toEqual({
			foodCount: 0,
			floorsWithoutFood: 1,
		});
		expect(
			drawFloorFood(createAlwaysMissRng(), FOOD_DROUGHT_FLOOR_LIMIT - 1),
		).toEqual({ foodCount: 0, floorsWithoutFood: FOOD_DROUGHT_FLOOR_LIMIT });
	});

	it("guarantees one ration once the drought passes FOOD_DROUGHT_FLOOR_LIMIT floors", () => {
		expect(
			drawFloorFood(createAlwaysMissRng(), FOOD_DROUGHT_FLOOR_LIMIT),
		).toEqual({ foodCount: 1, floorsWithoutFood: 0 });
	});

	it("averages about one ration every two floors, like original Rogue", () => {
		const rng = createRng(1);
		let total = 0;
		for (let floor = 0; floor < 2000; floor++) {
			/* a fresh counter every time: measures the rolls alone, not the guarantee */
			total += drawFloorFood(rng, 0).foodCount;
		}
		const average = total / 2000;
		expect(average).toBeGreaterThan(0.42);
		expect(average).toBeLessThan(0.62);
	});

	it("never leaves a run more than FOOD_DROUGHT_FLOOR_LIMIT floors in a row without food", () => {
		const rng = createRng(7);
		let floorsWithoutFood = 0;
		for (let floor = 0; floor < 500; floor++) {
			floorsWithoutFood = drawFloorFood(
				rng,
				floorsWithoutFood,
			).floorsWithoutFood;
			expect(floorsWithoutFood).toBeLessThanOrEqual(FOOD_DROUGHT_FLOOR_LIMIT);
		}
	});
});
