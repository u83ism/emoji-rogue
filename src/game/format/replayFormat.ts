import { err, ok, type Result } from "../../result.js";
import type { Replay } from "./replay.js";
import { isRecord } from "./validateGameState.js";
import { validateReplay } from "./validateReplay.js";

/** Independent of SAVE_FORMAT_VERSION — a replay and a save are different files. 2: ItemKind renames (use-item actions carry the kind). 3: ItemKind rename (shield -> armor). 4: use-item/drop-item address a held item by itemId instead of kind (milestone 81); drop-item validation added (was missing). 5: the file shape is unchanged, but milestone 111 (original Rogue's combat scale, 26 floors, a starting kit holding itemIds 1-3) makes every older replay play out differently — refused rather than replayed wrong. 6: `throw-item` action added (milestone 113); the starting kit also grew a bow and arrows, shifting itemIds. 7: shape unchanged, but wandering monsters (milestone 114) consume the rng stream every few turns, so older replays diverge. 8: shape unchanged, but milestone 115 (gold and enemies rolled room by room, among other original-Rogue rules) generates different floors from the same seed. 9: shape unchanged, but the ice monster's freeze and the quiet-turn reset on any adjacent enemy action change how runs play out. 10: shape unchanged, but strength (milestone 117) changes every hit roll. 11: shape unchanged, but the scorpion's poisoned sting consumes rng on its hits. 12: shape unchanged, but milestone 118 (items and rules not in original Rogue removed — the floor spawn table lost five kinds, a sleeping target no longer takes a guaranteed hit, the magic missile rolls its save and damage) changes how every run plays out. 13: the `descend`/`ascend`/`search` actions added and `throw-item` gained a direction (milestone 119 — the staircase, traps and throwing on original Rogue's rules, among many other changes to how a run plays out). 14: `move` takes the four diagonals too, and sight (lit and dark rooms), waking (mean monsters only), the medusa's gaze and the confused stumble follow original Rogue — older replays play out differently. */
export const REPLAY_FORMAT_VERSION = 14;

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
