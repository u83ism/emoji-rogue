import type { Key } from "ink";
import type { Action, Direction } from "./state.js";

const moveAction = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/**
 * Maps one keypress (as Ink's `useInput` reports it) to an `Action`.
 * Arrow keys and vi keys (hjkl) both move; `.` or space waits one turn;
 * `q` quits. Unbound keys map to `undefined` so the shell can ignore them
 * without consuming a turn.
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
	if (input === "." || input === " ") {
		return { type: "wait" };
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
