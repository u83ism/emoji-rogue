import type { Key } from "ink";
import type { Action, Direction } from "./state.js";

const moveAction = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/** The direction a keypress means — the arrow keys and hjkl — or undefined. Shared by moving and by the throw direction prompt. */
export const toDirection = (input: string, key: Key): Direction | undefined => {
	if (key.upArrow || input === "k") {
		return "north";
	}
	if (key.downArrow || input === "j") {
		return "south";
	}
	if (key.leftArrow || input === "h") {
		return "west";
	}
	if (key.rightArrow || input === "l") {
		return "east";
	}
	return undefined;
};

/**
 * Maps one keypress (as Ink's `useInput` reports it) to an `Action`.
 * Arrow keys and vi keys (hjkl) both move; `.` or space waits one turn;
 * `>`/`<` take the stairs and `s` searches (original Rogue's keys);
 * `S` suspend-saves (also the original's); `q` quits. Unbound keys map to `undefined` so the
 * shell can ignore them without consuming a turn.
 */
export const toAction = (input: string, key: Key): Action | undefined => {
	const direction = toDirection(input, key);
	if (direction !== undefined) {
		return moveAction(direction);
	}
	if (input === "." || input === " ") {
		return { type: "wait" };
	}
	if (input === ">") {
		return { type: "descend" };
	}
	if (input === "<") {
		return { type: "ascend" };
	}
	if (input === "s") {
		return { type: "search" };
	}
	if (input === "S") {
		return { type: "save" };
	}
	if (input === "q") {
		return { type: "quit" };
	}
	return undefined;
};

/* Kana, kanji, CJK punctuation (incl. the U+3000 full-width space the space
 * key produces), and full-width forms — what a Japanese IME left in
 * full-width mode emits instead of the keys this game binds. */
const FULL_WIDTH_PATTERN = /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/;

/**
 * Whether a keypress looks like it came from an IME in full-width mode.
 * In that mode most bound keys never reach the game (the IME swallows them
 * into its composition buffer), so the shell warns instead of guessing what
 * the player meant.
 */
export const isFullWidthInput = (input: string): boolean =>
	FULL_WIDTH_PATTERN.test(input);
