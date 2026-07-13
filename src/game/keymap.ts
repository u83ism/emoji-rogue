import type { Key } from "ink";
import type { Action, Direction } from "./state.js";

const moveAction = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/**
 * Maps one keypress (as Ink's `useInput` reports it) to an `Action`.
 * Arrow keys and vi keys (hjkl) both move; `q` quits. Unbound keys map to
 * `undefined` so the shell can ignore them without consuming a turn.
 */
export const toAction = (input: string, key: Key): Action | undefined => {
	if (key.upArrow || input === "k") {
		return moveAction("north");
	}
	if (key.downArrow || input === "j") {
		return moveAction("south");
	}
	if (key.leftArrow || input === "h") {
		return moveAction("west");
	}
	if (key.rightArrow || input === "l") {
		return moveAction("east");
	}
	if (input === "q") {
		return { type: "quit" };
	}
	return undefined;
};
