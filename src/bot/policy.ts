import type { Action, Direction, GameState, Position } from "../game/state.js";
import { encodePointKey } from "../pointkey.js";
import { findAdjacentEnemyDirection } from "./combatPolicy.js";
import { chooseGoal, isGoalStillValid } from "./goals.js";
import { decideItemToUse } from "./itemUsePolicy.js";
import {
	type BotMemory,
	isCyclingInPlace,
	updateMemoryForTurn,
} from "./memory.js";
import { findNearestReachableTarget } from "./pathfinding.js";

/** Consecutive no-progress turns (see memory.ts's signature) before the bot gives up on the whole run. */
export const STAGNATION_QUIT_TURNS = 80;

const resolveDirection = (
	from: Position,
	to: Position,
): Direction | undefined => {
	if (to.x === from.x && to.y === from.y - 1) {
		return "north";
	}
	if (to.x === from.x && to.y === from.y + 1) {
		return "south";
	}
	if (to.x === from.x - 1 && to.y === from.y) {
		return "west";
	}
	if (to.x === from.x + 1 && to.y === from.y) {
		return "east";
	}
	return undefined;
};

export interface BotDecision {
	readonly action: Action;
	readonly memory: BotMemory;
}

/**
 * One turn of the explore-everything bot:
 *  1. Give up the whole run (a "quit" action) once dozens of turns pass with
 *     no measurable progress at all (see memory.ts's stagnation signature) —
 *     the backstop for a policy bug or a genuine dead end.
 *  2. Paralyzed: wait, same as any action would resolve to.
 *  3. Use a beneficial held item if one is worth using this turn.
 *  4. Attack an adjacent enemy, if any — it attacks every turn regardless of
 *     what the player does, so finishing it off beats walking past it.
 *  5. Otherwise walk toward the current goal, recomputing it when reached,
 *     invalidated, or stuck oscillating in place (see isCyclingInPlace).
 */
export const decideAction = (
	state: GameState,
	previousMemory: BotMemory,
): BotDecision => {
	const memory = updateMemoryForTurn(state, previousMemory);

	if (memory.stagnantTurns >= STAGNATION_QUIT_TURNS) {
		return { action: { type: "quit" }, memory };
	}

	if (state.paralyzedTurnsRemaining > 0) {
		return { action: { type: "wait" }, memory };
	}

	const itemToUse = decideItemToUse(state);
	if (itemToUse !== undefined) {
		return {
			action: { type: "use-item", payload: { kind: itemToUse } },
			memory,
		};
	}

	const adjacentEnemyDirection = findAdjacentEnemyDirection(state);
	if (adjacentEnemyDirection !== undefined) {
		return {
			action: { type: "move", payload: { direction: adjacentEnemyDirection } },
			memory,
		};
	}

	const cycling = isCyclingInPlace(memory);
	const blacklistedGoals =
		cycling && memory.goal !== undefined
			? new Set([
					...memory.blacklistedGoals,
					encodePointKey(memory.goal.x, memory.goal.y),
				])
			: memory.blacklistedGoals;

	const reusableGoal =
		!cycling &&
		memory.goal !== undefined &&
		isGoalStillValid(state, memory.goal)
			? memory.goal
			: undefined;
	const goal = reusableGoal ?? chooseGoal(state, blacklistedGoals);

	const step = findNearestReachableTarget(
		state.terrain,
		state.player,
		(x, y) => x === goal.x && y === goal.y,
	);

	if (step === undefined) {
		/* The chosen goal turned out unreachable from here (a stale amulet/loot
		 * tile behind a wall after a Winds of Kron shuffle, in practice) —
		 * blacklist it and try again next turn instead of retrying forever. */
		return {
			action: { type: "wait" },
			memory: {
				...memory,
				goal: undefined,
				blacklistedGoals: new Set([
					...blacklistedGoals,
					encodePointKey(goal.x, goal.y),
				]),
			},
		};
	}

	const direction = resolveDirection(state.player, step.nextStep);
	if (direction === undefined) {
		throw new Error(
			"unreachable: findNearestReachableTarget's next step is always one orthogonal tile away",
		);
	}

	return {
		action: { type: "move", payload: { direction } },
		memory: { ...memory, goal, blacklistedGoals },
	};
};
