import {
	INVENTORY_CAPACITY,
	PLAYER_HUNGER_WARNING_THRESHOLD,
} from "../game/balance.js";
import type { GameState } from "../game/state.js";
import { encodePointKey } from "../pointkey.js";
import { findNearestReachableTarget } from "./pathfinding.js";

export type BotGoalKind = "loot" | "stairs";

/** A committed destination tile the bot is currently walking toward. */
export interface BotGoal {
	readonly kind: BotGoalKind;
	readonly x: number;
	readonly y: number;
}

/** Whether picking up one more item (gold and the amulet never take a slot) would even fit. */
const hasInventorySpace = (state: GameState): boolean =>
	state.inventory.length < INVENTORY_CAPACITY;

const isLootTile = (state: GameState, x: number, y: number): boolean => {
	if (
		hasInventorySpace(state) &&
		state.items.some((item) => item.x === x && item.y === y)
	) {
		return true;
	}
	if (state.goldPiles.some((pile) => pile.x === x && pile.y === y)) {
		return true;
	}
	return (
		state.amulet !== undefined && state.amulet.x === x && state.amulet.y === y
	);
};

const isFoodTile = (state: GameState, x: number, y: number): boolean =>
	hasInventorySpace(state) &&
	state.items.some(
		(item) => item.kind === "food" && item.x === x && item.y === y,
	);

/**
 * Picks the next destination tile: a food item takes priority the moment
 * none is held and hunger has crossed the warning threshold (a starvation
 * death is fatal and a run measurement found the plain nearest-loot search
 * repeatedly visiting closer non-food loot while an unreached food ration
 * sat further away, running out the clock) — then the nearest uncollected
 * item/gold/amulet ("explore until picking up everything"), then the
 * staircase once nothing is left to collect. Always returns a goal — the
 * staircase fallback is unconditional, since there is always exactly one on
 * the floor.
 *
 * Deliberately does *not* chase down unexplored-but-empty tiles once loot
 * runs out: the bot reads loot positions straight from GameState, which
 * (unlike a human player's fog of war) is never gated on having seen the
 * tile, so a dedicated "visit every remaining dark corner" pass would not
 * find anything more — only burn turns and food for a cosmetic, not
 * mission-relevant, notion of "fully seen" (an initial-run measurement
 * found roughly a third of a floor's turns going to exactly this, which the
 * food economy across a full 10-floor clear cannot afford).
 *
 * `blacklist` excludes tiles a previous goal got stuck oscillating around
 * (see memory.ts's cycle detection) so the same bad target is not picked
 * again immediately; it never excludes the staircase, which is the last
 * resort regardless.
 */
export const chooseGoal = (
	state: GameState,
	blacklist: ReadonlySet<string>,
): BotGoal => {
	const isNotBlacklisted = (x: number, y: number): boolean =>
		!blacklist.has(encodePointKey(x, y));

	const holdsFood = state.inventory.some((entry) => entry.kind === "food");
	if (!holdsFood && state.playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD) {
		const food = findNearestReachableTarget(
			state.terrain,
			state.player,
			(x, y) => isFoodTile(state, x, y) && isNotBlacklisted(x, y),
		);
		if (food !== undefined) {
			return { kind: "loot", x: food.x, y: food.y };
		}
	}

	const loot = findNearestReachableTarget(
		state.terrain,
		state.player,
		(x, y) => isLootTile(state, x, y) && isNotBlacklisted(x, y),
	);
	if (loot !== undefined) {
		return { kind: "loot", x: loot.x, y: loot.y };
	}

	return { kind: "stairs", x: state.stairs.x, y: state.stairs.y };
};

/** Whether a previously chosen goal is still worth pursuing, given the current state. */
export const isGoalStillValid = (state: GameState, goal: BotGoal): boolean => {
	switch (goal.kind) {
		case "loot":
			return isLootTile(state, goal.x, goal.y);
		case "stairs":
			return true;
	}
};
