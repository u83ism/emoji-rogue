import type { Rng } from "../../rng.js";
import { POTION_COUNT_PER_FLOOR } from "../balance.js";
import { hasItemIdentity } from "../events.js";
import { buildFloorItem } from "../items/heldItemFactory.js";
import type { Item, Position, Trap } from "../state.js";
import { drawSpawnTile } from "./spawnPool.js";
import { ITEM_SPAWN_TABLE } from "./spawnTable.js";
import { drawFloorTraps } from "./traps.js";

/** Everything drawFloorItems scatters on a floor — gold and enemies are placed per room instead (rooms.ts). */
export interface FloorItems {
	readonly items: readonly Item[];
	readonly traps: readonly Trap[];
	/** `nextItemId` after this floor's weapon/armor/ring spawns each consumed one — see heldItemFactory.ts's buildFloorItem. */
	readonly nextItemId: number;
}

/**
 * Every item and trap on a fresh floor, drawn from (and removed from)
 * `remaining` by consuming `rng`: POTION_COUNT_PER_FLOOR healing potions
 * guaranteed, `foodCount` food rations (floor/food.ts decides how many),
 * then the chance-rolled kinds of ITEM_SPAWN_TABLE, then every trap (see
 * traps.ts's drawFloorTraps). A spawned weapon/armor/ring also gets its identity (curse,
 * starting bonus, itemId) rolled here, once, from `nextItemId` — see
 * heldItemFactory.ts's buildFloorItem.
 */
export const drawFloorItems = (
	remaining: Position[],
	rng: Rng,
	isTrapTileEligible: (position: Position) => boolean,
	nextItemId: number,
	foodCount: number,
): FloorItems => {
	let itemId = nextItemId;
	const items: Item[] = [];
	for (let i = 0; i < POTION_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "heal-potion" });
	}
	for (let i = 0; i < foodCount && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "food" });
	}
	for (const spawn of ITEM_SPAWN_TABLE) {
		if (
			remaining.length > 0 &&
			rng.getUniformInt(0, 99) < spawn.chancePercent
		) {
			const position = drawSpawnTile(remaining, rng);
			items.push(buildFloorItem(spawn.kind, itemId, position, rng));
			if (hasItemIdentity(spawn.kind)) {
				itemId += 1;
			}
		}
	}

	const traps = drawFloorTraps(remaining, rng, isTrapTileEligible);

	return { items, traps, nextItemId: itemId };
};
