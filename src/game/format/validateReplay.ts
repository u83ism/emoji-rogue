import { err, ok, type Result } from "../../result.js";
import type { Action, Direction } from "../state.js";
import type { Replay } from "./replay.js";
import {
	isFiniteNumber,
	isPositiveInteger,
	isRecord,
} from "./validateGameState.js";

const isDirection = (value: unknown): value is Direction =>
	value === "north" ||
	value === "south" ||
	value === "west" ||
	value === "east";

const isAction = (value: unknown): value is Action => {
	if (!isRecord(value)) {
		return false;
	}
	switch (value.type) {
		case "move":
			return isRecord(value.payload) && isDirection(value.payload.direction);
		case "wait":
		case "save":
		case "quit":
			return true;
		case "use-item":
			return (
				isRecord(value.payload) &&
				isPositiveInteger(value.payload.itemId) &&
				(value.payload.targetItemId === undefined ||
					isPositiveInteger(value.payload.targetItemId))
			);
		case "drop-item":
			return isRecord(value.payload) && isPositiveInteger(value.payload.itemId);
		default:
			return false;
	}
};

/**
 * Checks that an untrusted value (a parsed replay file) is a well-formed
 * `Replay` and rebuilds it from known fields only. Same discipline as
 * validateGameState: a replay file is user-editable data on disk, so every
 * failure here is an expected outcome (Result), never a throw.
 */
export const validateReplay = (value: unknown): Result<Replay, string> => {
	if (!isRecord(value)) {
		return err("root");
	}
	const { width, height, seed } = value;
	if (!isPositiveInteger(width)) {
		return err("width");
	}
	if (!isPositiveInteger(height)) {
		return err("height");
	}
	if (!isFiniteNumber(seed)) {
		return err("seed");
	}
	const actions = value.actions;
	if (!Array.isArray(actions) || !actions.every(isAction)) {
		return err("actions");
	}

	return ok({ width, height, seed, actions: [...actions] });
};
