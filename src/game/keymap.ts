import type { Key } from "ink";
import type { Action, Direction } from "./state.js";

const moveAction = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/** The direction letters and digits: original Rogue's hjkl/yubn, and the number pad with NumLock on (8 up, 7 up-left …). */
const DIRECTION_KEYS: Readonly<Record<string, Direction>> = {
	k: "north",
	j: "south",
	h: "west",
	l: "east",
	y: "northwest",
	u: "northeast",
	b: "southwest",
	n: "southeast",
	"8": "north",
	"2": "south",
	"4": "west",
	"6": "east",
	"7": "northwest",
	"9": "northeast",
	"1": "southwest",
	"3": "southeast",
};

/**
 * The direction a keypress means, or undefined: the arrow keys, hjkl and
 * yubn, and the number pad — its digits with NumLock on, and with it off
 * the Home/PageUp/End/PageDown its 7/9/1/3 send for the diagonals. Shared
 * by moving and by the throw/zap direction prompt.
 */
export const toDirection = (input: string, key: Key): Direction | undefined => {
	if (key.upArrow) {
		return "north";
	}
	if (key.downArrow) {
		return "south";
	}
	if (key.leftArrow) {
		return "west";
	}
	if (key.rightArrow) {
		return "east";
	}
	if (key.home) {
		return "northwest";
	}
	if (key.pageUp) {
		return "northeast";
	}
	if (key.end) {
		return "southwest";
	}
	if (key.pageDown) {
		return "southeast";
	}
	return DIRECTION_KEYS[input];
};

/**
 * Maps one keypress (as Ink's `useInput` reports it) to an `Action`.
 * Arrow keys, vi keys (hjkl, yubn for the diagonals) and the number pad all move; `.` or space waits one turn;
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
