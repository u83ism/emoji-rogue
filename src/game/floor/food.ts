import type { Rng } from "../../rng.js";
import {
	FOOD_DROUGHT_FLOOR_LIMIT,
	FOOD_ROLL_CHANCE_BASIS_POINTS,
	FOOD_ROLLS_PER_FLOOR,
} from "../balance.js";

/** How many food rations a new floor gets, and the drought counter to carry to the floor after it. */
export interface FloorFoodDraw {
	readonly foodCount: number;
	readonly floorsWithoutFood: number;
}

/**
 * Original Rogue's food supply: every floor makes FOOD_ROLLS_PER_FLOOR item
 * rolls, each of which is a food ration FOOD_ROLL_CHANCE_BASIS_POINTS out of
 * 10000 times — about one ration every two floors. `floorsWithoutFood`
 * (original Rogue's no_food) counts the floors generated since the last
 * ration, this one included; once it passes FOOD_DROUGHT_FLOOR_LIMIT the
 * floor is given one for sure. Always consumes `rng` FOOD_ROLLS_PER_FLOOR
 * times.
 */
export const drawFloorFood = (
	rng: Rng,
	previousFloorsWithoutFood: number,
): FloorFoodDraw => {
	let rolled = 0;
	for (let roll = 0; roll < FOOD_ROLLS_PER_FLOOR; roll++) {
		if (rng.getUniformInt(0, 9999) < FOOD_ROLL_CHANCE_BASIS_POINTS) {
			rolled += 1;
		}
	}
	const droughtFloors = previousFloorsWithoutFood + 1;
	const foodCount =
		rolled === 0 && droughtFloors > FOOD_DROUGHT_FLOOR_LIMIT ? 1 : rolled;
	return {
		foodCount,
		floorsWithoutFood: foodCount > 0 ? 0 : droughtFloors,
	};
};
