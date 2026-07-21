import type { GameState } from "../game/state.js";
import { encodePointKey } from "../pointkey.js";
import type { BotGoal } from "./goals.js";

/** How many recent player positions to keep for oscillation detection. */
const RECENT_POSITION_WINDOW = 20;
/** Revisiting the current tile this many times within the window counts as circling, not exploring. */
const REPEAT_VISIT_THRESHOLD = 6;

export interface BotMemory {
	readonly floor: number;
	readonly goal: BotGoal | undefined;
	/** Goal tiles to skip on this floor — set by the policy when a goal turns out to be a dead end. */
	readonly blacklistedGoals: ReadonlySet<string>;
	/** Point keys of the last few turns' positions, oldest first, reset on every floor change. */
	readonly recentPositionKeys: readonly string[];
	readonly lastProgressSignature: string;
	/** Consecutive turns with no measurable progress at all — see buildProgressSignature. */
	readonly stagnantTurns: number;
}

export const createInitialBotMemory = (): BotMemory => ({
	floor: 1,
	goal: undefined,
	blacklistedGoals: new Set(),
	recentPositionKeys: [],
	lastProgressSignature: "",
	stagnantTurns: 0,
});

const countExploredCells = (state: GameState): number =>
	state.explored.reduce(
		(total, column) => total + column.filter(Boolean).length,
		0,
	);

/**
 * A cheap fingerprint of "has anything the run cares about changed": floor
 * depth, what is left lying around, inventory size, gold, the amulet,
 * experience, and how much of the map has been seen. Two turns with the
 * same signature mean the run is not moving forward by any measure, whether
 * that is a policy bug looping in place or a genuine dead end.
 */
const buildProgressSignature = (state: GameState): string =>
	[
		state.floor,
		state.items.length,
		state.goldPiles.length,
		state.inventory.reduce((total, entry) => total + entry.quantity, 0),
		state.goldCollected,
		state.hasAmulet,
		state.playerExperience,
		countExploredCells(state),
	].join("|");

/**
 * Carries BotMemory forward by one turn: resets everything floor-scoped
 * (goal, blacklist, position history) when the floor changed since last
 * turn — including a Winds of Kron forced eviction, which moves the player
 * without the bot ever choosing to — and updates the stagnation counter.
 */
export const updateMemoryForTurn = (
	state: GameState,
	previousMemory: BotMemory,
): BotMemory => {
	const floorChanged = state.floor !== previousMemory.floor;
	const positionKey = encodePointKey(state.player.x, state.player.y);
	const recentPositionKeys = floorChanged
		? [positionKey]
		: [...previousMemory.recentPositionKeys, positionKey].slice(
				-RECENT_POSITION_WINDOW,
			);

	const signature = buildProgressSignature(state);
	const stagnantTurns =
		signature === previousMemory.lastProgressSignature
			? previousMemory.stagnantTurns + 1
			: 0;

	return {
		floor: state.floor,
		goal: floorChanged ? undefined : previousMemory.goal,
		blacklistedGoals: floorChanged
			? new Set()
			: previousMemory.blacklistedGoals,
		recentPositionKeys,
		lastProgressSignature: signature,
		stagnantTurns,
	};
};

/**
 * True once the current tile has been revisited enough times recently to
 * call it an oscillation loop (e.g. pacing a dead-end corridor back and
 * forth) rather than genuine progress toward the current goal.
 */
export const isCyclingInPlace = (memory: BotMemory): boolean => {
	const currentPositionKey = memory.recentPositionKeys.at(-1);
	if (currentPositionKey === undefined) {
		return false;
	}
	const repeatCount = memory.recentPositionKeys.filter(
		(key) => key === currentPositionKey,
	).length;
	return repeatCount >= REPEAT_VISIT_THRESHOLD;
};
