import { createRng } from "../rng.js";
import { buildEventLog } from "./events.js";
import type { WeaponItem } from "./items/equipment/equipmentStats.js";
import type { Enemy, GameState, Item, Position } from "./state.js";
import { nameEnemy } from "./vision.js";

// Where a thrown weapon that hit nothing comes to rest — split out of
// throw.ts once aiming (milestone 119) pushed that file past the 200-line
// structure-lint limit.

/**
 * The tile a missile that missed comes to rest on: a random floor tile out
 * of the 3x3 around `target` (original Rogue's fallpos), skipping the
 * player's own tile and any tile that already holds an item or the
 * staircase. Undefined when none qualifies — the missile is simply lost.
 */
const drawLandingTile = (
	state: GameState,
	target: Position,
	rng: ReturnType<typeof createRng>,
): Position | undefined => {
	const candidates: Position[] = [];
	for (let x = target.x - 1; x <= target.x + 1; x++) {
		for (let y = target.y - 1; y <= target.y + 1; y++) {
			const isFree =
				state.terrain[x]?.[y] === 0 &&
				!(x === state.player.x && y === state.player.y) &&
				!(x === state.stairs.x && y === state.stairs.y) &&
				!state.items.some((item) => item.x === x && item.y === y);
			if (isFree) {
				candidates.push({ x, y });
			}
		}
	}
	return candidates.length === 0
		? undefined
		: candidates[rng.getUniformInt(0, candidates.length - 1)];
};

/**
 * A missile that hit nothing: it comes to rest near `at` (drawLandingTile)
 * and can be picked up again, or is lost when no tile is free. A missed
 * `target` wakes up (missile-missed); with none it just lands
 * (missile-landed).
 */
export const applyMissileLanding = (
	thrown: GameState,
	item: WeaponItem,
	at: Position,
	rngState: GameState["rng"],
	target: Enemy | undefined,
): GameState => {
	const rng = createRng(1).setState(rngState);
	const landing = drawLandingTile(thrown, at, rng);
	/* the last of a stack keeps its own id; one split off a stack needs a fresh one */
	const splitsStack = item.quantity > 1;
	const landed: Item | undefined =
		landing === undefined
			? undefined
			: {
					...landing,
					kind: "weapon",
					identity: {
						itemId: splitsStack ? thrown.nextItemId : item.itemId,
						weaponKind: item.weaponKind,
						cursed: item.cursed,
						hitBonus: item.hitBonus,
						damageBonus: item.damageBonus,
						quantity: 1,
					},
				};
	return {
		...thrown,
		rng: rng.getState(),
		nextItemId:
			landed !== undefined && splitsStack
				? thrown.nextItemId + 1
				: thrown.nextItemId,
		items: landed === undefined ? thrown.items : [...thrown.items, landed],
		enemies: thrown.enemies.map(
			(enemy): Enemy =>
				enemy === target ? { ...enemy, awake: true, held: false } : enemy,
		),
		events: buildEventLog(thrown.events, [
			target === undefined
				? { type: "missile-landed", payload: { variant: item.weaponKind } }
				: {
						type: "missile-missed",
						payload: {
							target: nameEnemy(thrown, target),
							variant: item.weaponKind,
						},
					},
		]),
	};
};
