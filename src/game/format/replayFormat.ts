import { err, ok, type Result } from "../../result.js";
import type { Replay } from "./replay.js";
import { isRecord } from "./validateGameState.js";
import { validateReplay } from "./validateReplay.js";

/** Independent of SAVE_FORMAT_VERSION — a replay and a save are different files. 2: ItemKind renames (use-item actions carry the kind). */
export const REPLAY_FORMAT_VERSION = 2;

export type ReplayFileError =
	| { readonly kind: "malformed-json" }
	| { readonly kind: "unsupported-version"; readonly foundVersion: unknown }
	| { readonly kind: "invalid-replay"; readonly field: string };

/** The exact text written to a replay file: a versioned Replay as JSON. */
export const buildReplayFileContent = (replay: Replay): string =>
	JSON.stringify({ formatVersion: REPLAY_FORMAT_VERSION, replay });

/**
 * The inverse of buildReplayFileContent for untrusted input. A replay file
 * is user-editable data on disk, so every failure here is an expected
 * outcome (Result), never a throw.
 */
export const parseReplayFileContent = (
	content: string,
): Result<Replay, ReplayFileError> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return err({ kind: "malformed-json" });
	}
	if (!isRecord(parsed)) {
		return err({ kind: "malformed-json" });
	}
	if (parsed.formatVersion !== REPLAY_FORMAT_VERSION) {
		return err({
			kind: "unsupported-version",
			foundVersion: parsed.formatVersion,
		});
	}
	const validated = validateReplay(parsed.replay);
	if (!validated.ok) {
		return err({ kind: "invalid-replay", field: validated.error });
	}
	return ok(validated.value);
};
