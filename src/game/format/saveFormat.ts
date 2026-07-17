import { err, ok, type Result } from "../../result.js";
import type { GameState } from "../state.js";
import { isRecord, validateGameState } from "./validateGameState.js";

/** Bump on any breaking change to the GameState shape. 2: floor + stairs. 3: items. 4: inventory. 5: playerAttackDamage. 6: playerDefense. 7: playerFood. 8: goldPiles + goldCollected. 9: traps. 10: identifiedPotionKinds. 11: enemies[].awake. 12: hasRingOfRegeneration. 13: stairs.direction + amulet + hasAmulet. 14: hasRingOfSustenance. 15: confusedTurnsRemaining. 16: enemies[].slowedTurnsRemaining. 17: levitationTurnsRemaining. 18: armorProtected. 19: blindTurnsRemaining. 20: playerMaxHp + playerLevel + playerExperience. 21: paralyzedTurnsRemaining. 22: detectMonstersTurnsRemaining. 23: turnsOnCurrentFloor. 24: hasAttacked + hasEaten. 25: ItemKind renames (heal-potion, teleport-scroll, mapping-scroll, identify-scroll, regeneration-ring, sustenance-ring, striking-wand, slow-wand). */
export const SAVE_FORMAT_VERSION = 25;

export type SaveFileError =
	| { readonly kind: "malformed-json" }
	| { readonly kind: "unsupported-version"; readonly foundVersion: unknown }
	| { readonly kind: "invalid-state"; readonly field: string };

/** The exact text written to a save file: a versioned GameState as JSON. */
export const buildSaveFileContent = (state: GameState): string =>
	JSON.stringify({ formatVersion: SAVE_FORMAT_VERSION, state });

/**
 * The inverse of buildSaveFileContent for untrusted input. A save file is
 * user-editable data on disk, so every failure here is an expected outcome
 * (Result), never a throw.
 */
export const parseSaveFileContent = (
	content: string,
): Result<GameState, SaveFileError> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return err({ kind: "malformed-json" });
	}
	if (!isRecord(parsed)) {
		return err({ kind: "malformed-json" });
	}
	if (parsed.formatVersion !== SAVE_FORMAT_VERSION) {
		return err({
			kind: "unsupported-version",
			foundVersion: parsed.formatVersion,
		});
	}
	const validated = validateGameState(parsed.state);
	if (!validated.ok) {
		return err({ kind: "invalid-state", field: validated.error });
	}
	return ok(validated.value);
};
