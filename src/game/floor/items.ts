import type { Rng } from "../../rng.js";
import {
	FOOD_DROUGHT_FLOOR_LIMIT,
	ITEM_DRAW_ATTEMPTS_PER_FLOOR,
	ITEM_DRAW_CHANCE_PERCENT,
} from "../balance.js";
import { hasItemIdentity, type ItemKind } from "../events.js";
import { buildFloorItem } from "../items/heldItemFactory.js";
import type { Item, Position, Trap } from "../state.js";
import { drawSpawnTile } from "./spawnPool.js";
import {
	calculateCategoryTotalWeight,
	ITEM_CATEGORY_TOTAL_WEIGHT,
	ITEM_CATEGORY_WEIGHTS,
	ITEM_KIND_WEIGHTS,
	pickByWeight,
} from "./spawnTable.js";
import { drawFloorTraps } from "./traps.js";

/** Everything drawFloorItems scatters on a floor — gold and enemies are placed per room instead (rooms.ts). */
export interface FloorItems {
	readonly items: readonly Item[];
	readonly traps: readonly Trap[];
	/** `nextItemId` after this floor's weapon/armor/ring/wand spawns each consumed one — see heldItemFactory.ts's buildFloorItem. */
	readonly nextItemId: number;
	/** The food drought counter to carry to the next floor (original Rogue's no_food). */
	readonly floorsWithoutFood: number;
}

/**
 * Original Rogue's new_thing(): which kind one found item is. The category
 * comes from ITEM_CATEGORY_WEIGHTS — or is food for sure once
 * `floorsWithoutFood` has passed FOOD_DROUGHT_FLOOR_LIMIT — then the kind
 * within it by its own weight (spawnTable.ts).
 */
const drawItemKind = (rng: Rng, floorsWithoutFood: number): ItemKind => {
	const category =
		floorsWithoutFood > FOOD_DROUGHT_FLOOR_LIMIT
			? "food"
			: pickByWeight(
					ITEM_CATEGORY_WEIGHTS,
					rng.getUniformInt(0, ITEM_CATEGORY_TOTAL_WEIGHT - 1),
				).category;
	return pickByWeight(
		ITEM_KIND_WEIGHTS[category],
		rng.getUniformInt(0, calculateCategoryTotalWeight(category) - 1),
	).kind;
};

/**
 * Every item and trap on a fresh floor, drawn from (and removed from)
 * `remaining` by consuming `rng`, as original Rogue's put_things():
 * ITEM_DRAW_ATTEMPTS_PER_FLOOR attempts, each making one item with
 * ITEM_DRAW_CHANCE_PERCENT chance (drawItemKind) — none at all when
 * `placesItems` is false (climbing back with the amulet). The food drought
 * counter goes up by one for the floor itself (new_level()'s no_food++)
 * and back to 0 with any food. Then every trap (traps.ts's drawFloorTraps).
 * A weapon/armor/ring/wand also gets its identity rolled here, once, from
 * `nextItemId` — see heldItemFactory.ts's buildFloorItem.
 */
export const drawFloorItems = (
	remaining: Position[],
	rng: Rng,
	floor: number,
	isTrapTileEligible: (position: Position) => boolean,
	nextItemId: number,
	previousFloorsWithoutFood: number,
	placesItems: boolean,
): FloorItems => {
	let itemId = nextItemId;
	let floorsWithoutFood = previousFloorsWithoutFood + 1;
	const items: Item[] = [];
	for (
		let attempt = 0;
		placesItems && attempt < ITEM_DRAW_ATTEMPTS_PER_FLOOR;
		attempt++
	) {
		if (
			remaining.length === 0 ||
			rng.getUniformInt(0, 99) >= ITEM_DRAW_CHANCE_PERCENT
		) {
			continue;
		}
		const kind = drawItemKind(rng, floorsWithoutFood);
		if (kind === "food") {
			floorsWithoutFood = 0;
		}
		items.push(
			buildFloorItem(kind, itemId, drawSpawnTile(remaining, rng), rng),
		);
		if (hasItemIdentity(kind)) {
			itemId += 1;
		}
	}

	const traps = drawFloorTraps(remaining, rng, floor, isTrapTileEligible);

	return { items, traps, nextItemId: itemId, floorsWithoutFood };
};
